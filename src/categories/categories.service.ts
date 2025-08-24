import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from 'src/common/utils/slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);

    try {
      return await this.prisma.category.create({
        data: { name: dto.name, slug },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Categoria já existe (slug ou nome único).',
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },

      // include: {posts: true}
    });
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');

    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const data: any = { ...dto };

    if (dto.name) data.slug = slugify(dto.name);

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error.code === 'P2025')
        throw new NotFoundException('Categoria não encontrada.');
      if (error.code === 'P2002')
        throw new ConflictException('Slug já está em uso.');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error.code === 'P2025')
        throw new NotFoundException('Categoria não encontrada');
      throw error;
    }
  }
}
