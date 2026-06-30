import request from 'supertest';

type WorkOrderBody = {
  clientId: string;
  vehicleId: string;
  description: string;
  openingDate: string;
  assignedMechanic?: string;
};

type HttpServer = Parameters<typeof request>[0];

export const createWorkOrderRequest = (
  httpServer: HttpServer,
  token: string,
  body: WorkOrderBody,
) => request(httpServer).post('/work-orders').set('Authorization', `Bearer ${token}`).send(body);

export const getWorkOrdersRequest = (httpServer: HttpServer, token: string) =>
  request(httpServer).get('/work-orders').set('Authorization', `Bearer ${token}`);
