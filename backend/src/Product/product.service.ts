import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
    constructor(private readonly prisma: PrismaService) { }
    async getAllProducts() {
        return await this.prisma.product.findMany();
    }
    async getProductById(id: number) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
        }

        return product;
    }
}