import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { slugify } from 'src/common/utils/slugify';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTagDto) {
    const slug = slugify(dto.name);

    try {
      return await this.prisma.tag.create({
        data: { name: dto.name, slug },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Tag já existe (slug ou nome único).');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string) {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('Tag não encontrada.');
    return tag;
  }

  async update(id: string, dto: UpdateTagDto) {
    const data: any = { ...dto };
    if (dto.name) data.slug = slugify(dto.name);

    try {
      return await this.prisma.tag.update({ where: { id }, data });
    } catch (e: any) {
      if (e.code === 'P2025')
        throw new NotFoundException('Tag não encontrada.');
      if (e.code === 'P2002')
        throw new ConflictException('Slug já está em uso.');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.tag.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      if (e.code === 'P2025')
        throw new NotFoundException('Tag não encontrada.');
      throw e;
    }
  }
}
