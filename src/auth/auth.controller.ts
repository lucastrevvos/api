import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { id } = await this.auth.register(dto.email, dto.password, dto.name);
    return { id };
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password);

    if (!user) return { error: 'Credenciais inválidas' } as any;

    return this.auth.issueTokens(user.id);
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    return this.auth.logout(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.auth.me(user.sub);
  }
}
