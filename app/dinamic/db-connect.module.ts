import 'dotenv/config';
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Exemplo de módulo dinâmico
 */
export const databases = {
  production: {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_DATABASE ?? 'lojita',
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'change-me',
    autoLoadEntities:
      (process.env.DB_AUTO_LOAD_ENTITIES ?? 'false') === 'true',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'false') === 'true',
  },
  test: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'lojita',
    username: 'postgres',
    password: '12345678',
    autoLoadEntities: true,
    synchronize: true,
  },
} as const;

export type DatabaseType = keyof typeof databases;

export type DBConnectModuleConfigs = {
  type: DatabaseType;
};

/**
 * Este módulo centraliza a configuração de conexões com diferentes bancos de dados
 * Obs: neste caso separando por type um banco que seria para produção e outro de testes
 */
@Module({})
export class DBConnectModule {
  static register(configs: DBConnectModuleConfigs): DynamicModule {
    const databaseConfig = databases[configs.type];

    return {
      module: DBConnectModule,
      imports: [
        TypeOrmModule.forRoot({
          ...databaseConfig,
          type: 'postgres',
        } as TypeOrmModuleOptions),
      ],
    };
  }
}
