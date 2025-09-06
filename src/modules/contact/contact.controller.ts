import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { Role } from 'src/common/enum/user_role.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  createContact(@Body() createContactDto: CreateContactDto) {
    return this.contactService.createContact(createContactDto);
  }

  @Get('messages')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getAllContacts() {
    return this.contactService.getAllContacts();
  }

  @Get('messages/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getContactById(@Param('id') id: string) {
    return this.contactService.getContactById(id);
  }

  @Patch('messages/:id/read')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  markAsRead(@Param('id') id: string) {
    return this.contactService.markAsRead(id);
  }

  @Delete('messages/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  deleteContact(@Param('id') id: string) {
    return this.contactService.deleteContact(id);
  }

  @Get('business-info')
  getBusinessInfo() {
    return this.contactService.getBusinessInfo();
  }

  @Patch('business-info')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateBusinessInfo(@Body() updateBusinessInfoDto: UpdateBusinessInfoDto) {
    return this.contactService.updateBusinessInfo(updateBusinessInfoDto);
  }
}
