import { randomUUID } from "node:crypto";
import type { Server } from "node:http";

import express from "express";
import { afterAll, beforeAll, expect, test } from "vitest";

import { signToken, signWithOtherKey } from "./helpers/auth.ts";
import { requireAuth } from "../../src/http/auth.ts";
import { app as coreApp } from "../../src/server.ts";

const ACCOUNT = randomUUID();

const app = express();
app.use(requireAuth);
app.get("/protected", (req, res) => {
  res.json({ accountId: res.locals.accountId, operatorId: res.locals.operatorId });
});

let server: Server;
let coreServer: Server;
let baseUrl: string;
let coreUrl: string;

beforeAll(() => {
  server = app.listen(0);
  coreServer = coreApp.listen(0);
  baseUrl = addressOf(server);
  coreUrl = addressOf(coreServer);
});

afterAll(() => {
  server.close();
  coreServer.close();
});

function addressOf(server: Server): string {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return `http://127.0.0.1:${port}`;
}

function withToken(token: string) {
  return { headers: { authorization: `Bearer ${token}` } };
}

test("sem token -> 401", async () => {
  const response = await fetch(`${baseUrl}/protected`);
  expect(response.status).toBe(401);
});

test("token válido -> 200 e expõe o accountId", async () => {
  const token = await signToken({ accountId: ACCOUNT });
  const response = await fetch(`${baseUrl}/protected`, withToken(token));

  expect(response.status).toBe(200);
  expect((await response.json()).accountId).toBe(ACCOUNT);
});

test("token válido sem accountId -> 401", async () => {
  const token = await signToken({});
  const response = await fetch(`${baseUrl}/protected`, withToken(token));
  expect(response.status).toBe(401);
});

test("token expirado -> 401", async () => {
  const token = await signToken({ accountId: ACCOUNT }, "-1h");
  const response = await fetch(`${baseUrl}/protected`, withToken(token));
  expect(response.status).toBe(401);
});

test("token adulterado -> 401", async () => {
  const [header, payload, signature] = (await signToken({ accountId: ACCOUNT })).split(".");
  const response = await fetch(
    `${baseUrl}/protected`,
    withToken(`${header}.${payload}x.${signature}`),
  );
  expect(response.status).toBe(401);
});

test("assinado por outra chave -> 401", async () => {
  const token = await signWithOtherKey({ accountId: ACCOUNT });
  const response = await fetch(`${baseUrl}/protected`, withToken(token));
  expect(response.status).toBe(401);
});

test("cabeçalho sem Bearer -> 401", async () => {
  const response = await fetch(`${baseUrl}/protected`, {
    headers: { authorization: "abc" },
  });
  expect(response.status).toBe(401);
});

test("a API núcleo protege as rotas reais: sem token -> 401", async () => {
  const response = await fetch(`${coreUrl}/products`);
  expect(response.status).toBe(401);
});
