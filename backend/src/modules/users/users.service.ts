import { Injectable } from '@nestjs/common';
import { users, products } from '../../data/mock-data';

@Injectable()
export class UsersService {
  getProfile() {
    const user = users[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }

  updateProfile(data: { name?: string; email?: string; phone?: string }) {
    const user = users[0];
    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email;
    if (data.phone) user.phone = data.phone;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }

  getAddresses() {
    return users[0].addresses;
  }

  addAddress(address: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    type: string;
  }) {
    users[0].addresses.push({
      ...address,
      addressLine2: address.addressLine2 || '',
    });
    return users[0].addresses;
  }

  getWishlist() {
    const user = users[0];
    return products.filter((p) => user.wishlist.includes(p.id));
  }

  toggleWishlist(productId: string) {
    const user = users[0];
    const index = user.wishlist.indexOf(productId);
    if (index >= 0) {
      user.wishlist.splice(index, 1);
      return { added: false, wishlist: user.wishlist };
    } else {
      user.wishlist.push(productId);
      return { added: true, wishlist: user.wishlist };
    }
  }
}
