import z from "zod";
import { Rpc } from "../core/rpc/Rpc";
import { RpcRepository } from "../core/rpc/RpcRepository";

const cellSchema = z.object({
    cell_id: z.number(),
    cell_name: z.string(),
    cell_value: z.string(),
    is_stretched: z.boolean(),
    products_ids: z.array(
        z.object({
            id: z.number(),
        })
    ),
});

const rectangleSchema = z.object({
    id: z.number(),
    cell_ids: z.array(
        z.object({
            id: z.number(),
        })
    ),
    map_cells: z.record(
        z.string(),
        z.object({
            id: z.number(),
            type: z.enum(["box", "pallet"]),
            parent: z
                .object({
                    id: z.number(),
                    code: z.string(),
                })
                .optional(),
        })
    ),
});

const productSchema = z.object({
    id: z.number(),
    article: z.string(),
    name: z.string(),
    gravatar: z.string(),
    barcode_ids: z.array(
        z.object({
            id: z.number(),
        })
    ),
    is_stretched: z.boolean(),
});

const cellRpc = new Rpc("cell", cellSchema, "cell_id", {
    products_ids: "id",
});
const rectangleRpc = new Rpc("rectangle", rectangleSchema, "id", {
    cell_ids: "id",
});
const productRpc = new Rpc("product", productSchema, "id", {
    barcode_ids: "id",
});

const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc)
    .registerRpc("product", productRpc)
    .registerRpc("rectangle", rectangleRpc);

rpcRepository.defineRelation("rectangle", "cell").hasMany(
    {
        field: "cell_ids",
        key: "id",
    },
    "cell_id"
);

rpcRepository.defineRelation("cell", "product").hasMany(
    {
        field: "products_ids",
        key: "id",
    },
    "id"
);

export type Cell = z.infer<typeof cellSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;
export type Product = z.infer<typeof productSchema>;

rpcRepository.save("product", {
    id: 1,
    article: "ART001",
    name: "Товар 1",
    gravatar: "https://example.com/img1.jpg",
    barcode_ids: [
        {
            id: 1001,
        },
        {
            id: 1002,
        },
    ],
    is_stretched: false,
});

rpcRepository.save("product", {
    id: 2,
    article: "ART002",
    name: "Товар 2",
    gravatar: "https://example.com/img2.jpg",
    barcode_ids: [
        {
            id: 2001,
        },
        {
            id: 2002,
        },
    ],
    is_stretched: true,
});

rpcRepository.save("cell", {
    cell_id: 1,
    cell_name: "Ячейка A1",
    cell_value: "CELL_000222222",
    is_stretched: true,
    products_ids: [
        {
            id: 1,
        },
        {
            id: 2,
        },
    ],
});

rpcRepository.save("cell", {
    cell_id: 2,
    cell_name: "Ячейка B1",
    cell_value: "CELL_000333213",
    is_stretched: false,
    products_ids: [
        {
            id: 2,
        },
    ],
});

rpcRepository.save("rectangle", {
    id: 1,
    cell_ids: [
        {
            id: 1,
        },
        {
            id: 2,
        },
    ],
    map_cells: {
        pos_1_1: {
            id: 101,
            type: "pallet",
        },
        pos_1_2: {
            id: 102,
            type: "box",
            parent: { id: 101, code: "pos_1_1" },
        },
        pos_2_1: {
            id: 201,
            type: "box",
        },
    },
});

type CellWithProducts = Cell & {
    products: Product[];
};

type RectangleWithData = Rectangle & {
    cells: CellWithProducts[];
};

async function getAllRectanglesWithData(): Promise<RectangleWithData[]> {
    const allRectangles = rpcRepository.findAll("rectangle");

    const rectanglesWithData = await Promise.all(
        allRectangles.map(async (rectangle) => {
            const cellsPromises = rectangle.cell_ids.map(
                async ({ id: cellId }) => {
                    const cell = await rpcRepository.findById("cell", cellId);
                    if (!cell) return null;

                    const products = await Promise.all(
                        cell.products_ids.map(async ({ id: productId }) =>
                            rpcRepository.findById("product", productId)
                        )
                    );
                    const validProducts = products.filter(
                        (product): product is Product => product !== null
                    );

                    return {
                        ...cell,
                        products: validProducts,
                    };
                }
            );
            const cells = await Promise.all(cellsPromises);
            const validCells = cells.filter(
                (cell): cell is CellWithProducts => cell !== null
            );

            return {
                ...rectangle,
                cells: validCells,
            };
        })
    );

    return rectanglesWithData;
}

getAllRectanglesWithData().then((rectanglesWithAllData) => {
    console.log(JSON.stringify(rectanglesWithAllData, null, 2));
});
