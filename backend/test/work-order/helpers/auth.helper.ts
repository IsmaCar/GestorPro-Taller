import request from 'supertest';

type HttpServer = Parameters<typeof request>[0];

type TenantPayload = {
  adminName: string;
  garageName: string;
  fiscalId: string;
  adminEmail: string;
  password: string;
};

export type AuthContext = {
  token: string;
  garageId: string;
  userId: string;
  tenant: TenantPayload;
};

export const buildTenantPayload = (seed = Date.now().toString()): TenantPayload => ({
  adminName: 'Ismael Carballo Martin',
  garageName: 'Talleres Carballo',
  fiscalId: seed,
  adminEmail: `carballomartinismael${seed}@gmail.com`,
  password: 'password123',
});

export const registerAndLoginOwner = async (httpServer: HttpServer): Promise<AuthContext> => {
  const tenant = buildTenantPayload();

  await request(httpServer).post('/auth/register-tenant').send(tenant);

  const loginResponse = await request(httpServer).post('/auth/login-owner').send({
    email: tenant.adminEmail,
    password: tenant.password,
  });

  return {
    token: loginResponse.body.access_token,
    garageId: loginResponse.body.user.garageId,
    userId: loginResponse.body.user.id,
    tenant,
  };
};
