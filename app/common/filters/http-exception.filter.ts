import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

type ErrorDetails = Record<string, string[]>;
type ErrorResponse = {
  status: number;
  message: string;
  details: ErrorDetails;
};

type DatabaseError = {
  code?: string;
  detail?: string;
  query?: string;
};

type HttpResponse = {
  status(code: number): {
    json(body: ErrorResponse): void;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isErrorDetails(value: unknown): value is ErrorDetails {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) =>
        Array.isArray(messages) &&
        messages.every((message) => typeof message === 'string'),
    )
  );
}

function getDatabaseError(exception: unknown): DatabaseError | undefined {
  if (!(exception instanceof QueryFailedError)) {
    return undefined;
  }

  const driverError: unknown = exception.driverError;
  if (!isRecord(driverError)) {
    return undefined;
  }

  return {
    code: typeof driverError.code === 'string' ? driverError.code : undefined,
    detail:
      typeof driverError.detail === 'string' ? driverError.detail : undefined,
    query: exception.query,
  };
}

function getDatabaseStatus(error: DatabaseError): HttpStatus | undefined {
  if (error.code === '23505') {
    return HttpStatus.CONFLICT;
  }

  if (error.code === '23503') {
    if (error.detail?.includes('is still referenced')) {
      return HttpStatus.CONFLICT;
    }

    if (error.detail?.includes('is not present')) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    return /^\s*DELETE\b/i.test(error.query ?? '')
      ? HttpStatus.CONFLICT
      : HttpStatus.UNPROCESSABLE_ENTITY;
  }

  return undefined;
}

function getHttpErrorResponse(exception: HttpException): {
  message: string;
  details: ErrorDetails;
} {
  const response: unknown = exception.getResponse();
  if (typeof response === 'string') {
    return { message: response, details: {} };
  }

  if (!isRecord(response)) {
    return { message: exception.message, details: {} };
  }

  const responseMessage = response.message;
  const message =
    typeof responseMessage === 'string'
      ? responseMessage
      : exception.message || 'Request failed';
  const details = isErrorDetails(response.details) ? response.details : {};

  return { message, details };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    const databaseError = getDatabaseError(exception);
    const databaseStatus = databaseError
      ? getDatabaseStatus(databaseError)
      : undefined;

    let errorResponse: ErrorResponse;

    if (databaseStatus !== undefined) {
      errorResponse = {
        status: databaseStatus,
        message:
          databaseStatus === HttpStatus.CONFLICT
            ? 'Database constraint violation'
            : 'Referenced resource does not exist',
        details: {},
      };
    } else if (exception instanceof HttpException) {
      const { message, details } = getHttpErrorResponse(exception);
      errorResponse = {
        status: exception.getStatus(),
        message,
        details,
      };
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : undefined,
      );
      errorResponse = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        details: {},
      };
    }

    response.status(errorResponse.status).json(errorResponse);
  }
}
