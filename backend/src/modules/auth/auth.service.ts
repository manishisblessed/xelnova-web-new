import { Injectable } from '@nestjs/common';
import { users } from '../../data/mock-data';

@Injectable()
export class AuthService {
  private otpStore: Map<string, string> = new Map();

  login(email: string, password: string) {
    const user = users.find((u) => u.email === email);
    if (!user) return { error: 'Invalid email or password' };

    // Mock password check — accept any password in dev
    const token = `mock-jwt-token-${Date.now()}`;
    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      token,
    };
  }

  register(name: string, email: string, phone: string, password: string) {
    const existing = users.find((u) => u.email === email);
    if (existing) return { error: 'User with this email already exists' };

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone,
      avatar: '/images/users/default.jpg',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    users.push(newUser);
    const token = `mock-jwt-token-${Date.now()}`;

    return {
      user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, avatar: newUser.avatar },
      token,
    };
  }

  sendOtp(phone: string) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(phone, otp);
    return { message: `OTP sent to ${phone}`, otp };
  }

  verifyOtp(phone: string, otp: string) {
    const storedOtp = this.otpStore.get(phone);
    if (!storedOtp || storedOtp !== otp) {
      return { error: 'Invalid OTP' };
    }
    this.otpStore.delete(phone);

    let user = users.find((u) => u.phone === phone);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        name: 'User',
        email: '',
        phone,
        avatar: '/images/users/default.jpg',
        addresses: [],
        wishlist: [],
        createdAt: new Date().toISOString().split('T')[0],
      };
      users.push(user);
    }

    const token = `mock-jwt-token-${Date.now()}`;
    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      token,
      isNewUser: !user.email,
    };
  }
}
