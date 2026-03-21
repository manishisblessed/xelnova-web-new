import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const options: StrategyOptions = {
      clientID: configService.get('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      avatar: photos?.[0]?.value,
      accessToken,
    };
    
    done(null, user);
  }
}
