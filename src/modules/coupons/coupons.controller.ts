import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/user_role.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UseGlobalFileInterceptor } from 'src/common/decorator/globalFileInterceptor.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async create(
    @Body() createCouponDto: CreateCouponDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.couponsService.create(createCouponDto, file);
    return {
      message: 'Coupon created successfully',
      data: result,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.couponsService.findAll(page, limit);
  }

  @Get('active')
  findActive(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.couponsService.findActive(page, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGlobalFileInterceptor({ fieldName: 'image', maxCount: 1 })
  async update(
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.couponsService.update(id, updateCouponDto, file);
    return {
      message: 'Coupon updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: string) {
    const result = await this.couponsService.remove(id);
    return {
      message: 'Coupon deleted successfully',
      data: result,
    };
  }

  @Post('apply')
  async applyCoupon(@Body() applyCouponDto: ApplyCouponDto) {
    const coupon = await this.couponsService.findByCode(applyCouponDto.code);
    return coupon;
  }
}
