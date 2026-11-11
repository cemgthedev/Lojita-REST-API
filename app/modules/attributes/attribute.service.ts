import { Attribute } from '@/entities/attribute.entity';
import { CreateAttributeDto } from '@/modules/attributes/dto/create-attribute.dto';
import { UpdateAttributeDto } from '@/modules/attributes/dto/update-attribute.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    readonly attributesRepository: Repository<Attribute>,
  ) {}

  async create(attribute: CreateAttributeDto) {
    const nameRegistered: boolean = await this.attributesRepository.exists({
      where: { name: attribute.name },
    });

    if (nameRegistered) {
      throw new ConflictException(
        `Atributo com nome '${attribute.name}' já existe`,
      );
    }

    const newAttribute = this.attributesRepository.create(attribute);

    return this.attributesRepository.save(newAttribute);
  }

  async findAll() {
    return await this.attributesRepository.find();
  }

  async findOne(id: number) {
    const responseAttribute: Attribute | null =
      await this.attributesRepository.findOne({
        where: { id },
      });

    if (!responseAttribute) {
      throw new NotFoundException(`Atributo de id #${id} não foi encontrado`);
    }

    return responseAttribute;
  }

  async update(id: number, attribute: UpdateAttributeDto) {
    const responseAttribute: Attribute = await this.findOne(id);

    const nameRegistered: boolean = await this.attributesRepository.exists({
      where: { name: attribute.name },
    });

    if (nameRegistered) {
      throw new ConflictException(
        `Atributo com nome '${attribute.name}' já existe`,
      );
    }

    Object.assign(responseAttribute, attribute);

    return this.attributesRepository.save(responseAttribute);
  }

  async remove(id: number) {
    await this.findOne(id);

    const response = await this.attributesRepository.delete(id);

    if (!response.affected) {
      throw new ConflictException(`Não foi possível remover o atributo`);
    }

    return `Atributo foi removido com sucesso`;
  }
}
