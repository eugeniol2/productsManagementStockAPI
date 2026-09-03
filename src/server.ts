import { pathToFileURL } from "node:url";

import express, { type Request, type Response } from "express";

import { prisma } from "./database/prisma.ts";
import { requireAuth } from "./http/auth.ts";
import {
  CODE_ALREADY_KNOWN,
  EXPIRY_REQUIRED,
  INVALID_BARCODE,
  INVALID_CODE,
  INVALID_OBSERVATION,
  INVALID_OBSERVATION_ID,
  INVALID_PRICE,
  INVALID_PRODUCT_ID,
  INVALID_QUERY,
  INVALID_SALE,
  INVALID_STOCK_ENTRY,
  NOT_FOUND,
  OBSERVATION_NOT_FOUND,
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
import { listPendingObservations } from "./stock/barcodes/barcodes.queries.ts";
import {
  barcodeSchema,
  observationSchema,
} from "./stock/barcodes/barcodes.schema.ts";
import {
  addBarcode,
  dismissObservation,
  recordBarcodeObservation,
} from "./stock/barcodes/barcodes.service.ts";
import { listCategories } from "./stock/categories/categories.queries.ts";
import {
  findProductByCode,
  findProductById,
  listProducts,
} from "./stock/products/products.queries.ts";
import {
  priceSchema,
  productQuerySchema,
} from "./stock/products/products.schema.ts";
import { updateProductPrice } from "./stock/products/products.service.ts";
import { stockEntrySchema } from "./stock/stockEntries/stockEntries.schema.ts";
import { registerStockEntry } from "./stock/stockEntries/stockEntries.service.ts";
import { saleSchema } from "./stock/sales/sales.schema.ts";
import { ProductNotFound, registerSale } from "./stock/sales/sales.service.ts";

export const app = express();
const port = Number(process.env.PORT ?? 3000);
app.disable("x-powered-by");
app.use(logRequest);
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(requireAuth);

app.get("/categories", async (req: Request, res: Response) => {
  res.json(await listCategories(prisma, res.locals.accountId));
});

app.get("/products", async (req: Request, res: Response) => {
  const query = productQuerySchema.safeParse(req.query);

  if (!query.success) {
    rejectInvalid(req, res, INVALID_QUERY, query.error);
    return;
  }

  res.json(await listProducts(prisma, res.locals.accountId, query.data.categoryId));
});

app.get(
  "/products/code/:code",
  async (req: Request<{ code: string }>, res: Response) => {
    if (!isValidCode(req.params.code)) {
      fail(res, INVALID_CODE);
      return;
    }

    const product = await findProductByCode(prisma, res.locals.accountId, req.params.code);

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

    const product = await findProductById(prisma, res.locals.accountId, id);

    if (!product) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }
    res.json(product);
  },
);

app.put(
  "/products/:id/price",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      fail(res, INVALID_PRODUCT_ID);
      return;
    }

    const body = priceSchema.safeParse(req.body);

    if (!body.success) {
      rejectInvalid(req, res, INVALID_PRICE, body.error);
      return;
    }

    const product = await updateProductPrice(
      prisma,
      res.locals.accountId,
      id,
      body.data.salePrice,
    );

    if (!product) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }
    res.json(product);
  },
);

app.post("/stock-entries", async (req: Request, res: Response) => {
  const body = stockEntrySchema.safeParse(req.body);

  if (!body.success) {
    rejectInvalid(req, res, INVALID_STOCK_ENTRY, body.error);
    return;
  }

  const result = await registerStockEntry(
    prisma,
    res.locals.accountId,
    res.locals.operatorId,
    body.data,
  );

  if (!result.ok) {
    fail(res, result.reason === "PRODUCT_NOT_FOUND" ? PRODUCT_NOT_FOUND : EXPIRY_REQUIRED);
    return;
  }
  res
    .status(result.replayed ? 200 : 201)
    .json({ ...result.entry, replayed: result.replayed });
});

app.post("/sales", async (req: Request, res: Response) => {
  const sale = saleSchema.safeParse(req.body);

  if (!sale.success) {
    rejectInvalid(req, res, INVALID_SALE, sale.error);
    return;
  }

  try {
    const result = await registerSale(
      prisma,
      res.locals.accountId,
      res.locals.operatorId,
      sale.data,
    );

    res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof ProductNotFound) {
      fail(res, PRODUCT_NOT_FOUND);
      return;
    }

    throw error;
  }
});

app.post(
  "/products/:id/barcodes",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      fail(res, INVALID_PRODUCT_ID);
      return;
    }

    const body = barcodeSchema.safeParse(req.body);

    if (!body.success) {
      rejectInvalid(req, res, INVALID_BARCODE, body.error);
      return;
    }

    const result = await addBarcode(
      prisma,
      res.locals.accountId,
      id,
      body.data.code,
      body.data.unitsPerScan,
    );

    if (!result.ok) {
      if (result.reason === "PRODUCT_NOT_FOUND") {
        fail(res, PRODUCT_NOT_FOUND);
        return;
      }
      res.status(409).json({ error: "CODE_TAKEN", productId: result.productId });
      return;
    }
    res.status(result.created ? 201 : 200).json(result.barcode);
  },
);

app.get("/barcode-observations", async (req: Request, res: Response) => {
  res.json(await listPendingObservations(prisma, res.locals.accountId));
});

app.post("/barcode-observations", async (req: Request, res: Response) => {
  const body = observationSchema.safeParse(req.body);

  if (!body.success) {
    rejectInvalid(req, res, INVALID_OBSERVATION, body.error);
    return;
  }

  const result = await recordBarcodeObservation(
    prisma,
    res.locals.accountId,
    res.locals.operatorId,
    body.data.code,
    body.data.productId,
  );

  if (!result.ok) {
    fail(res, result.reason === "PRODUCT_NOT_FOUND" ? PRODUCT_NOT_FOUND : CODE_ALREADY_KNOWN);
    return;
  }
  res.status(201).json(result.observation);
});

app.delete(
  "/barcode-observations/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseId(req.params.id);

    if (id === null) {
      fail(res, INVALID_OBSERVATION_ID);
      return;
    }

    const dismissed = await dismissObservation(prisma, res.locals.accountId, id);

    if (!dismissed) {
      fail(res, OBSERVATION_NOT_FOUND);
      return;
    }
    res.status(204).end();
  },
);

app.use((req: Request, res: Response) => {
  fail(res, NOT_FOUND);
});

app.use(handleErrors);

const runningAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (runningAsScript) {
  const server = app.listen(port, () => {
    console.log(JSON.stringify({ event: "server_started", port }));
  });

  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;

  const shutdownGracefully = () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  };

  process.on("SIGTERM", shutdownGracefully);
  process.on("SIGINT", shutdownGracefully);
}
