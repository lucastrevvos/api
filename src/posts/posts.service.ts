import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePostDto) {
    const { categoryIds = [], tagIds = [], status = 'DRAFT', ...data } = dto;

    const payload: any = {
      ...data,
      authorId,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      categories: categoryIds.length
        ? { create: categoryIds.map((id) => ({ categoryId: id })) }
        : undefined,
      tags: tagIds.length
        ? { create: tagIds.map((id) => ({ tagId: id })) }
        : undefined,
    };

    return this.prisma.post.create({
      data: payload,
      include: {
        author: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  async findAll(filter: FilterPostsDto) {
    const { authorId, slug, status, categoryId, tagId } = filter;

    return this.prisma.post.findMany({
      where: {
        authorId,
        slug,
        status,
        categories: categoryId
          ? {
              some: { categoryId },
            }
          : undefined,
        tags: tagId
          ? {
              some: { tagId },
            }
          : undefined,
      },
      include: { categories: true, tags: true, author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { categories: true, tags: true, author: true },
    });

    if (!post) throw new NotFoundException('Post não encontrado');
    return post;
  }

  async update(id: string, dto: UpdatePostDto) {
    const { categoryIds, tagIds, status, ...data } = dto as any;

    const updateData: any = { ...data };

    if (status) {
      updateData.status = status;
      if (status === 'PUBLISHED') updateData.publishedAt = new Date();
      if (status === 'DRAFT') updateData.publishedAt = null;
    }

    const [, updated] = await this.prisma.$transaction([
      ...(categoryIds
        ? [this.prisma.postCategory.deleteMany({ where: { postId: id } })]
        : []),
      ...(tagIds
        ? [this.prisma.postTag.deleteMany({ where: { postId: id } })]
        : []),
      this.prisma.post.update({
        where: { id },
        data: {
          ...updateData,
          ...(categoryIds
            ? {
                categories: {
                  create: categoryIds.map((cid: string) => ({
                    categoryId: cid,
                  })),
                },
              }
            : {}),
          ...(tagIds
            ? {
                tags: { create: tagIds.map((tid: string) => ({ tagId: tid })) },
              }
            : {}),
        },
        include: {
          author: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      }),
    ]);

    return updated;
  }

  async delete(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }
}
