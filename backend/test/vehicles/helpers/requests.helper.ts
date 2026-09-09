import request from 'supertest';

type VehicleCreateBody = {
  clientId: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  color?: string;
};

type VehicleUpdateBody = {
  clientId?: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  color?: string;
};

type VehicleQueryParams = {
  page?: number;
  limit?: number;
  clientId?: string;
  licensePlate?: string;
  brand?: string;
};

type HttpServer = Parameters<typeof request>[0];

export const createVehicleRequest = (
  httpServer: HttpServer,
  token: string,
  body: VehicleCreateBody,
) => request(httpServer).post('/vehicles').set('Authorization', `Bearer ${token}`).send(body);

export const getVehiclesRequest = (
  httpServer: HttpServer,
  token: string,
  query?: VehicleQueryParams,
) => {
  let req = request(httpServer).get('/vehicles').set('Authorization', `Bearer ${token}`);

  if (query) {
    if (query.page !== undefined) req = req.query({ page: query.page });
    if (query.limit !== undefined) req = req.query({ limit: query.limit });
    if (query.clientId !== undefined) req = req.query({ clientId: query.clientId });
    if (query.licensePlate !== undefined) req = req.query({ licensePlate: query.licensePlate });
    if (query.brand !== undefined) req = req.query({ brand: query.brand });
  }

  return req;
};

export const getVehicleByIdRequest = (httpServer: HttpServer, token: string, id: string) =>
  request(httpServer).get(`/vehicles/${id}`).set('Authorization', `Bearer ${token}`);

export const updateVehicleRequest = (
  httpServer: HttpServer,
  token: string,
  id: string,
  body: VehicleUpdateBody,
) =>
  request(httpServer).patch(`/vehicles/${id}`).set('Authorization', `Bearer ${token}`).send(body);

export const deleteVehicleRequest = (httpServer: HttpServer, token: string, id: string) =>
  request(httpServer).delete(`/vehicles/${id}`).set('Authorization', `Bearer ${token}`);
