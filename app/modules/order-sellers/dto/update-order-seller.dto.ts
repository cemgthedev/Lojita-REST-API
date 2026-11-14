import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderSellerDto } from './create-order-seller.dto';

export class UpdateOrderSellerDto extends PartialType(CreateOrderSellerDto) {}
