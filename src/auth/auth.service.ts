import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ── private helper
  private async generateTokens(userId: number) {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });
    const accessToken = this.jwtService.sign(
      { userId, refreshToken },
      { expiresIn: '1d' },
    );
    return { accessToken, refreshToken };
  }

  // ── register ──────────────────────────────────────────────────
  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'User already exists! Please try with a different email',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newlyCreatedUser = await this.prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // generate tokens on register so user is immediately logged in
    const { accessToken, refreshToken } = await this.generateTokens(
      newlyCreatedUser.id,
    );

    const { password: _, ...result } = newlyCreatedUser;
    return { ...result, accessToken, refreshToken };
  }

  // ── login ─────────────────────────────────────────────────────
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials! Please try again');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials! Please try again');
    }

    // each login creates a new refresh token (multi-device support)
    // old tokens from other devices remain valid
    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    const { password: _, ...result } = user;

    return { ...result, accessToken, refreshToken };
  }

  // ── refresh token ─────────────────────────────────────────────
  // called automatically by frontend when accessToken expires (every 15 mins)
  // deletes old refreshToken and issues a brand new pair
  async refreshToken(token: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // delete the used refresh token (rotation — each token can only be used once)
    await this.prisma.refreshToken.delete({
      where: { token },
    });

    // issue a fresh pair
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(storedToken.userId);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      message: 'Tokens regenerated successfully',
    };
  }

  // ── logout ────────────────────────────────────────────────────
  // deletes only THIS device's refresh token
  // user remains logged in on other devices
  async logout(userId: number, refreshToken: string) {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken, userId },
    });

    if (result.count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { userId, message: 'Logout successful' };
  }

  // ── logout all devices ────────────────────────────────────────
  // optional — deletes ALL refresh tokens for this user
  async logoutAll(userId: number) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { userId, message: 'Logged out from all devices successfully' };
  }
}
