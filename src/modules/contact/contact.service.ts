import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact } from './schema/contact.schema';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { BusinessInfo } from 'src/modules/contact/schema/business-info.schema';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(BusinessInfo.name)
    private businessInfoModel: Model<BusinessInfo>,
  ) {}

  async createContact(createContactDto: CreateContactDto) {
    const createdContact = new this.contactModel(createContactDto);
    return await createdContact.save();
  }

  async getAllContacts() {
    return await this.contactModel.find().sort({ createdAt: -1 }).exec();
  }

  async getContactById(id: string) {
    const contact = await this.contactModel.findById(id).exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  async markAsRead(id: string) {
    const contact = await this.contactModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async deleteContact(id: string) {
    const result = await this.contactModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return result;
  }

  async getBusinessInfo() {
    let businessInfo = await this.businessInfoModel.findOne().exec();

    // If no business info exists, create default one
    if (!businessInfo) {
      businessInfo = new this.businessInfoModel({
        phone: '',
        email: '',
        State: '',
        City: '',
        Country: '',
      });
      await businessInfo.save();
    }

    return businessInfo;
  }

  async updateBusinessInfo(updateBusinessInfoDto: UpdateBusinessInfoDto) {
    let businessInfo = await this.businessInfoModel.findOne().exec();

    if (!businessInfo) {
      businessInfo = new this.businessInfoModel(updateBusinessInfoDto);
    } else {
      businessInfo.set(updateBusinessInfoDto);
    }

    return await businessInfo.save();
  }
}
