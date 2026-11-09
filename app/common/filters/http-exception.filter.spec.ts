import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { HttpExceptionFilter } from './http-exception.filter';

function createQueryError(
  query: string,
  code: string,
  detail?: string,
): QueryFailedError {
  const driverError = Object.assign(new Error('internal database message'), {
    code,
    detail,
  });
  return new QueryFailedError(query, [], driverError);
}

function invokeFilter(exception: unknown) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  new HttpExceptionFilter().catch(exception, host);
  return response;
}

describe('HttpExceptionFilter', () => {
  it('returns a standardized 404 response', () => {
    const response = invokeFilter(new NotFoundException('User not found'));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.NOT_FOUND,
      message: 'User not found',
      details: {},
    });
  });

  it('returns validation details in the standardized response', () => {
    const response = invokeFilter(
      new BadRequestException({
        message: 'Validation failed',
        details: { email: ['email must be an email'] },
      }),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      details: { email: ['email must be an email'] },
    });
  });

  it.each([
    ['unique key', '23505', 'Key (email)=(a@example.com) already exists.'],
    ['primary key', '23505', 'Key (id)=(42) already exists.'],
  ])('maps a duplicate %s violation to 409', (_kind, code, detail) => {
    const response = invokeFilter(
      createQueryError('INSERT INTO users', code, detail),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.CONFLICT,
      message: 'Database constraint violation',
      details: {},
    });
  });

  it('maps a foreign key violation on create or edit to 422', () => {
    const response = invokeFilter(
      createQueryError(
        'INSERT INTO orders',
        '23503',
        'Key (user_id)=(42) is not present in table "users".',
      ),
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Referenced resource does not exist',
      details: {},
    });
  });

  it('maps a deletion blocked by dependent records to 409', () => {
    const response = invokeFilter(
      createQueryError(
        'DELETE FROM users',
        '23503',
        'Key (id)=(42) is still referenced from table "orders".',
      ),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.CONFLICT,
      message: 'Database constraint violation',
      details: {},
    });
  });

  it('does not expose unexpected error or database details', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const response = invokeFilter(
      createQueryError('SELECT secret FROM users', 'XX000'),
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      details: {},
    });
    logger.mockRestore();
  });
});
