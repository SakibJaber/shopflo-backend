import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { Product, ProductSchema } from '../products/schema/product.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { Favorite, FavoriteSchema } from 'src/modules/favorite/schema/favorite,schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FavoriteController],
  providers: [FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}
