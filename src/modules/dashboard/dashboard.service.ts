import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schema/user.schema';
import { Order } from '../order/schema/order.schema';
import { UserStatus } from 'src/common/enum/user.status.enum';
import { PaymentStatus } from 'src/common/enum/payment.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  //  TOP CARDS
  async getTopStats() {
    const [totalUsers, totalBlocked, totalOrders, totalEarningsAgg] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: UserStatus.BLOCKED }),
      this.orderModel.countDocuments(),
      this.orderModel.aggregate([
        { $match: { paymentStatus: PaymentStatus.SUCCEEDED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const totalEarnings = totalEarningsAgg.length > 0 ? totalEarningsAgg[0].total : 0;

    return {
      totalUsers,
      totalBlocked,
      totalOrders,
      totalEarnings,
    };
  }

  //  USER GROWTH — monthly signup stats
  async getUserGrowth(year: number) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const result = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Fill missing months
    const data = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = result.find(r => r._id.month === month);
      return { month, total: found ? found.total : 0 };
    });

    return data;
  }

  //  ORDER GROWTH — monthly order count
  async getOrderGrowth(year: number) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = result.find(r => r._id.month === month);
      return { month, total: found ? found.total : 0 };
    });
  }

  //  TOTAL EARNINGS — monthly revenue graph
  async getEarningsGrowth(year: number) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.SUCCEEDED,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$total' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = result.find(r => r._id.month === month);
      return { month, total: found ? found.total : 0 };
    });
  }
}
