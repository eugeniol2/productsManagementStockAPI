import express, { type Request, type Response } from "express";

import { prisma } from "./database/prisma.ts";
import {
  INVALID_CODE,
  INVALID_PRODUCT_ID,
  INVALID_QUERY,
  INVALID_SALE,
  NOT_FOUND,
  PRODUCT_NOT_FOUND,
  fail,
} from "./http/errors.ts";
import { handleErrors } from "./http/handleErrors.ts";
import {
  HEADERS_TIMEOUT_MS,
  KEEP_ALIVE_TIMEOUT_MS,
  MAX_BODY_SIZE,
  REQUEST_TIMEOUT_MS,
} from "./http/limits.ts";
import { isValidCode, parseId, rejectInvalid } from "./http/validation.ts";
import { logRequest } from "./http/logRequest.ts";
import { listCategories } from "./stock/categories/categories.queries.ts";
import {
  findProductByCode,
  findProductById,
  listProducts,
} from "./stock/products/products.queries.ts";
import { productQuerySchema } from "./stock/products/products.schema.ts";
import { saleSchema } from "./stock/sales/sales.schema.ts";
import { ProductNotFound, registerSale } from "./stock/sales/sales.service.ts";

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.disable("x-powered-by");
app.use(logRequest);
app.use(express.json({ limit: MAX_BODY_SIZE }));

app.get("/categories", async (req: Request, res: Response) => {
  res.json(await listCategories(prisma));
});

app.get("/products", async (req: Request, res: Response) => {
  const query = productQuerySchema.safeParse(req.query);

  if (!query.success) {
    rejectInvalid(req, res, INVALID_QUERY, query.error);
    return;
  }

  res.json(await listProducts(prisma, query.data.categoryId));
});

app.get(
  "/products/code/:code",
  async (req: Request<{ code: string }>, res: Response) => {
    if (!isValidCode(req.params.code)) {
      fail(res, INVALID_CODE);
      return;
    }

    const product = await findProductByCode(prisma, req.params.code);

    if (!product) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }
    res.json(product);
  },
);

app.get(
  "/products/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      fail(res, INVALID_PRODUCT_ID);
      return;
    }

    const product = await findProductById(prisma, id);

    if (!product) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }
    res.json(product);
  },
);

app.post("/sales", async (req: Request, res: Response) => {
  const sale = saleSchema.safeParse(req.body);

  if (!sale.success) {
    rejectInvalid(req, res, INVALID_SALE, sale.error);
    return;
  }

  try {
    const result = await registerSale(prisma, sale.data);

    res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof ProductNotFound) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }

    throw error;
  }
});

app.use((req: Request, res: Response) => {
  fail(res, NOT_FOUND);
});

app.use(handleErrors);

const server = app.listen(port, () => {
  console.log(JSON.stringify({ event: "server_started", port }));
});

server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.requestTimeout = REQUEST_TIMEOUT_MS;

function shutdownGracefully() {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}

process.on("SIGTERM", shutdownGracefully);
process.on("SIGINT", shutdownGracefully);
