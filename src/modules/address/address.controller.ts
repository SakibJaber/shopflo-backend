import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  async create(@Req() req, @Body() createAddressDto: CreateAddressDto) {
    const address = await this.addressService.create(
      req.user.userId,
      createAddressDto,
    );

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Address created successfully',
      data: address,
    };
  }

  @Get()
  async findAll(@Req() req) {
    const addresses = await this.addressService.findAll(req.user.userId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Addresses fetched successfully',
      data: addresses,
    };
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const address = await this.addressService.findOne(req.user.userId, id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Address fetched successfully',
      data: address,
    };
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(
      req.user.userId,
      id,
      updateAddressDto,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Address updated successfully',
      data: address,
    };
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    await this.addressService.remove(req.user.userId, id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Address deleted successfully',
      data: null,
    };
  }

  @Patch(':id/default')
  async setDefault(@Req() req, @Param('id') id: string) {
    const address = await this.addressService.setDefaultAddress(
      req.user.userId,
      id,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Default address set successfully',
      data: address,
    };
  }
}
