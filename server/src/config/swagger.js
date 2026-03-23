import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Insurance Incentive Management System API',
      version: '1.0.0',
      description: `
        Complete API documentation for the Insurance Incentive
        Management System. Supports Life Asia AS400 and KGILS Penta
        integration, MLM hierarchy incentive calculation,
        and SAP FICO / Oracle Financials payout export.
      `,
      contact: {
        name: 'API Support',
        email: 'support@yourdomain.com',
      },
    },
    servers: [
      { url: 'http://localhost:5000/api/v1', description: 'Development (v1)' },
      { url: 'http://localhost:5000/api', description: 'Development (unversioned)' },
      { url: 'https://api.incentive.yourdomain.com/api/v1', description: 'Production (v1)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from POST /auth/login',
        },
        SystemBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'System-to-system JWT from POST /auth/system-token',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            code: { type: 'string', example: 'VAL_001' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/**/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
