import z from "zod";
import { Rpc } from "../core/rpc/Rpc";
import { RepositoryTypes, RpcRepository } from "../core/rpc/RpcRepository";

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
export const cellTestSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.enum(["shelf", "pallet", "box", "loss"]),
    is_stretched: z.boolean(),
    parent_cell_id: z.number().nullable(),
    code: z.string(),
    warehouse_id: z.number(),
    children: z.array(z.object({ id: z.number() })),
    products: z.array(
        z.object({
            id: z.number(),
            barcodes: z.array(z.object({ id: z.number() })),
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

export const barcodeCodeSchema = z.record(
    z.string(),
    z.object({
        id: z.number(),
        version: z.number(),
    })
);

const cellRpc = new Rpc("cell", cellSchema, "cell_id");

const rectangleRpc = new Rpc("rectangle", rectangleSchema, "id");

const productRpc = new Rpc("product", productSchema, "id");

const settingsSchema = z.object({
    id: z.number(),
    theme: z.string(),
    language: z.string(),
    notifications: z.boolean(),
});

const errorSchema = z.object({
    code: z.enum(["AUTHENTICATION_ERROR"]),
    msg: z.string(),
    tech_msg: z.string().optional(),
    text_code: z.string().optional(),
});

const settingsRpc = new Rpc("settings", settingsSchema);
const errorRpc = new Rpc("error", errorSchema);
const barcodeCodeRpc = new Rpc("barcode_code", barcodeCodeSchema);
const cellTestRpc = new Rpc("cell_test", cellTestSchema, "id").setMergePath({
    products: "id",
    "products.barcodes": "id",
    children: "id",
});
const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc, { storageType: "collection" })
    .registerRpc("product", productRpc, { storageType: "collection" })
    .registerRpc("rectangle", rectangleRpc, { storageType: "collection" })
    .registerRpc("settings", settingsRpc, { storageType: "singleton" })
    .registerRpc("error", errorRpc, { storageType: "singleton" })
    .registerRpc("barcode_code", barcodeCodeRpc, { storageType: "singleton" })
    .registerRpc("cell_test", cellTestRpc, { storageType: "collection" });

rpcRepository.defineRelation("rectangle", "cell", "cells").hasMany(
    {
        field: "cell_ids",
        key: "id",
    },
    "cell_id"
);

rpcRepository.defineRelation("cell", "product", "products").hasMany(
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

console.log("\n=== Рекурсивная связь cell -> cell ===");

const hierarchicalCellSchema = z.object({
    id: z.number(),
    name: z.string(),
    parent_id: z.number().optional(),
    children_ids: z.array(z.object({ id: z.number() })).optional(),
});

const hierarchicalCellRpc = new Rpc(
    "hierarchical_cell",
    hierarchicalCellSchema,
    "id"
);

const hierarchicalRepository = new RpcRepository().registerRpc(
    "hierarchical_cell",
    hierarchicalCellRpc,
    { storageType: "collection" }
);

hierarchicalRepository
    .defineRelation("hierarchical_cell", "hierarchical_cell", "children")
    .hasMany(
        {
            field: "children_ids",
            key: "id",
        },
        "parent_id"
    );

const parentCell = hierarchicalRepository.save("hierarchical_cell", {
    id: 1,
    name: "Parent Cell",
    parent_id: undefined,
    children_ids: [{ id: 2 }, { id: 3 }],
});

const childCell1 = hierarchicalRepository.save("hierarchical_cell", {
    id: 2,
    name: "Child Cell 1",
    parent_id: 1,
    children_ids: [],
});

const childCell2 = hierarchicalRepository.save("hierarchical_cell", {
    id: 3,
    name: "Child Cell 2",
    parent_id: 1,
    children_ids: [{ id: 4 }],
});

const grandchildCell = hierarchicalRepository.save("hierarchical_cell", {
    id: 4,
    name: "Grandchild Cell",
    parent_id: 3,
    children_ids: [],
});

interface HierarchicalCell {
    id: number;
    name: string;
    parent_id?: number;
    children_ids?: { id: number }[];
    children?: HierarchicalCell[];
}

const fullHierarchy =
    hierarchicalRepository.getFullRelatedData<HierarchicalCell>(
        "hierarchical_cell",
        1
    );
console.log("Полная иерархия ячеек:", JSON.stringify(fullHierarchy, null, 2));

const allCellsWithHierarchy =
    hierarchicalRepository.getFullRelatedData<HierarchicalCell>(
        "hierarchical_cell"
    );
console.log(
    "Все ячейки с иерархией:",
    JSON.stringify(allCellsWithHierarchy, null, 2)
);

console.log("Состояние после обработки сообщений:");
console.log(JSON.stringify(rpcRepository.getState(), null, 2));

console.log("\n=== Система событий изменений данных ===");

console.log(
    "Количество активных слушателей:",
    rpcRepository.getDataChangedListenerCount()
);

console.log("\n--- Создание новых данных ---");
rpcRepository.save("product", {
    id: 4,
    article: "ART006",
    name: "Товар 4",
    gravatar: "https://example.com/img6.jpg",
    barcode_ids: [{ id: 6001 }],
    is_stretched: true,
});

console.log("\n--- Удаление данных ---");
rpcRepository.remove("product", 2);

console.log("\n--- Очистка слушателей ---");

console.log(
    "Количество активных слушателей после очистки:",
    rpcRepository.getDataChangedListenerCount()
);

console.log("\n=== Singleton Example ===");

rpcRepository.save("settings", {
    id: 1,
    theme: "dark",
    language: "ru",
    notifications: true,
});

const settings = rpcRepository.findAll("settings");
console.log("Settings (singleton):", JSON.stringify(settings, null, 2));

const singleSetting = rpcRepository.findById("settings", "any-id");
console.log("Single setting:", JSON.stringify(singleSetting, null, 2));

rpcRepository.save("settings", {
    id: 1,
    theme: "light",
    language: "en",
    notifications: false,
});

const updatedSettings = rpcRepository.findAll("settings");
console.log("Updated settings:", JSON.stringify(updatedSettings, null, 2));

console.log("\n=== Collection vs Singleton Comparison ===");

console.log("Cell storage type:", rpcRepository.getStorageType("cell"));
console.log("Settings storage type:", rpcRepository.getStorageType("settings"));

console.log("\n=== Error Schema Singleton Example ===");

console.log(
    "Initial error:",
    JSON.stringify(rpcRepository.findAll("error"), null, 2)
);

import { createRpcStorageType } from "../core/utils/rpc-utils";

const RpcStorageType = createRpcStorageType({
    cell: "collection",
    product: "collection",
    rectangle: "collection",
    settings: "singleton",
    error: "singleton",
    barcode_code: "singleton",
    cell_test: "collection",
} as const);

type RpcStorageType = typeof RpcStorageType;

// Примеры использования утилит
import { CollectionKeys, SingletonKeys } from "../core/utils/rpc-utils";
import { Message, MessageWithStorageType } from "../core/types";

// Ключи для разных типов
type CollectionTypeKeys = CollectionKeys<RpcStorageType>; // "cell" | "product" | "rectangle"
type SingletonTypeKeys = SingletonKeys<RpcStorageType>; // "settings" | "error"

setTimeout(() => {
    rpcRepository.mergeRpc("settings", null);
    rpcRepository.mergeRpc("error", {
        code: "AUTHENTICATION_ERROR",
        msg: "Authentication error",
    });
}, 3000);

const testBarcodes = {
    "0000007959028": {
        id: 795902,
        version: 1,
    },
    '{"barcode_id":795902,"product_id":50504,"ff_user_id":259}': {
        id: 795902,
        version: 2,
    },
    "795902_50504_259": {
        id: 795902,
        version: 3,
    },
    B_795902_50504_259: {
        id: 795902,
        version: 4,
    },
    "0000007959356": {
        id: 795935,
        version: 1,
    },
    '{"barcode_id":795935,"product_id":50562,"ff_user_id":259}': {
        id: 795935,
        version: 2,
    },
    "795935_50562_259": {
        id: 795935,
        version: 3,
    },
    B_795935_50562_259: {
        id: 795935,
        version: 4,
    },
    "0000008019813": {
        id: 801981,
        version: 1,
    },
    '{"barcode_id":801981,"product_id":44273,"ff_user_id":297}': {
        id: 801981,
        version: 2,
    },
    "801981_44273_297": {
        id: 801981,
        version: 3,
    },
    B_801981_44273_297: {
        id: 801981,
        version: 4,
    },
    "0000008019820": {
        id: 801982,
        version: 1,
    },
    '{"barcode_id":801982,"product_id":44273,"ff_user_id":297}': {
        id: 801982,
        version: 2,
    },
    "801982_44273_297": {
        id: 801982,
        version: 3,
    },
    B_801982_44273_297: {
        id: 801982,
        version: 4,
    },
    "0000008019844": {
        id: 801984,
        version: 1,
    },
    '{"barcode_id":801984,"product_id":44273,"ff_user_id":297}': {
        id: 801984,
        version: 2,
    },
    "801984_44273_297": {
        id: 801984,
        version: 3,
    },
    B_801984_44273_297: {
        id: 801984,
        version: 4,
    },
    "0000008019851": {
        id: 801985,
        version: 1,
    },
    '{"barcode_id":801985,"product_id":44273,"ff_user_id":297}': {
        id: 801985,
        version: 2,
    },
    "801985_44273_297": {
        id: 801985,
        version: 3,
    },
    B_801985_44273_297: {
        id: 801985,
        version: 4,
    },
    "0000008019868": {
        id: 801986,
        version: 1,
    },
    '{"barcode_id":801986,"product_id":44273,"ff_user_id":297}': {
        id: 801986,
        version: 2,
    },
    "801986_44273_297": {
        id: 801986,
        version: 3,
    },
    B_801986_44273_297: {
        id: 801986,
        version: 4,
    },
    "0000008019875": {
        id: 801987,
        version: 1,
    },
    '{"barcode_id":801987,"product_id":44273,"ff_user_id":297}': {
        id: 801987,
        version: 2,
    },
    "801987_44273_297": {
        id: 801987,
        version: 3,
    },
    B_801987_44273_297: {
        id: 801987,
        version: 4,
    },
    "0000008019905": {
        id: 801990,
        version: 1,
    },
    '{"barcode_id":801990,"product_id":44273,"ff_user_id":297}': {
        id: 801990,
        version: 2,
    },
    "801990_44273_297": {
        id: 801990,
        version: 3,
    },
    B_801990_44273_297: {
        id: 801990,
        version: 4,
    },
    "0000008019912": {
        id: 801991,
        version: 1,
    },
    '{"barcode_id":801991,"product_id":44273,"ff_user_id":297}': {
        id: 801991,
        version: 2,
    },
    "801991_44273_297": {
        id: 801991,
        version: 3,
    },
    B_801991_44273_297: {
        id: 801991,
        version: 4,
    },
    "0000008019929": {
        id: 801992,
        version: 1,
    },
    '{"barcode_id":801992,"product_id":44273,"ff_user_id":297}': {
        id: 801992,
        version: 2,
    },
    "801992_44273_297": {
        id: 801992,
        version: 3,
    },
    B_801992_44273_297: {
        id: 801992,
        version: 4,
    },
    "0000008019936": {
        id: 801993,
        version: 1,
    },
    '{"barcode_id":801993,"product_id":44273,"ff_user_id":297}': {
        id: 801993,
        version: 2,
    },
    "801993_44273_297": {
        id: 801993,
        version: 3,
    },
    B_801993_44273_297: {
        id: 801993,
        version: 4,
    },
    "0000009688216": {
        id: 968821,
        version: 1,
    },
    '{"barcode_id":968821,"product_id":54928,"ff_user_id":31}': {
        id: 968821,
        version: 2,
    },
    "968821_54928_31": {
        id: 968821,
        version: 3,
    },
    B_968821_54928_31: {
        id: 968821,
        version: 4,
    },
    "0000009688223": {
        id: 968822,
        version: 1,
    },
    '{"barcode_id":968822,"product_id":54928,"ff_user_id":31}': {
        id: 968822,
        version: 2,
    },
    "968822_54928_31": {
        id: 968822,
        version: 3,
    },
    B_968822_54928_31: {
        id: 968822,
        version: 4,
    },
    "0000009688254": {
        id: 968825,
        version: 1,
    },
    '{"barcode_id":968825,"product_id":54928,"ff_user_id":31}': {
        id: 968825,
        version: 2,
    },
    "968825_54928_31": {
        id: 968825,
        version: 3,
    },
    B_968825_54928_31: {
        id: 968825,
        version: 4,
    },
    "0000009688261": {
        id: 968826,
        version: 1,
    },
    '{"barcode_id":968826,"product_id":54928,"ff_user_id":31}': {
        id: 968826,
        version: 2,
    },
    "968826_54928_31": {
        id: 968826,
        version: 3,
    },
    B_968826_54928_31: {
        id: 968826,
        version: 4,
    },
    "0000009688278": {
        id: 968827,
        version: 1,
    },
    '{"barcode_id":968827,"product_id":54928,"ff_user_id":31}': {
        id: 968827,
        version: 2,
    },
    "968827_54928_31": {
        id: 968827,
        version: 3,
    },
    B_968827_54928_31: {
        id: 968827,
        version: 4,
    },
    "0000009688308": {
        id: 968830,
        version: 1,
    },
    '{"barcode_id":968830,"product_id":54928,"ff_user_id":31}': {
        id: 968830,
        version: 2,
    },
    "968830_54928_31": {
        id: 968830,
        version: 3,
    },
    B_968830_54928_31: {
        id: 968830,
        version: 4,
    },
    "0000009688377": {
        id: 968837,
        version: 1,
    },
    '{"barcode_id":968837,"product_id":54928,"ff_user_id":31}': {
        id: 968837,
        version: 2,
    },
    "968837_54928_31": {
        id: 968837,
        version: 3,
    },
    B_968837_54928_31: {
        id: 968837,
        version: 4,
    },
    "0000009688391": {
        id: 968839,
        version: 1,
    },
    '{"barcode_id":968839,"product_id":54928,"ff_user_id":31}': {
        id: 968839,
        version: 2,
    },
    "968839_54928_31": {
        id: 968839,
        version: 3,
    },
    B_968839_54928_31: {
        id: 968839,
        version: 4,
    },
    "0000009688407": {
        id: 968840,
        version: 1,
    },
    '{"barcode_id":968840,"product_id":54928,"ff_user_id":31}': {
        id: 968840,
        version: 2,
    },
    "968840_54928_31": {
        id: 968840,
        version: 3,
    },
    B_968840_54928_31: {
        id: 968840,
        version: 4,
    },
    "0000009688452": {
        id: 968845,
        version: 1,
    },
    '{"barcode_id":968845,"product_id":54928,"ff_user_id":31}': {
        id: 968845,
        version: 2,
    },
    "968845_54928_31": {
        id: 968845,
        version: 3,
    },
    B_968845_54928_31: {
        id: 968845,
        version: 4,
    },
    "0000012345038": {
        id: 1234503,
        version: 1,
    },
    '{"barcode_id":1234503,"product_id":44205,"ff_user_id":297}': {
        id: 1234503,
        version: 2,
    },
    "1234503_44205_297": {
        id: 1234503,
        version: 3,
    },
    B_1234503_44205_297: {
        id: 1234503,
        version: 4,
    },
    "0000012345045": {
        id: 1234504,
        version: 1,
    },
    '{"barcode_id":1234504,"product_id":44205,"ff_user_id":297}': {
        id: 1234504,
        version: 2,
    },
    "1234504_44205_297": {
        id: 1234504,
        version: 3,
    },
    B_1234504_44205_297: {
        id: 1234504,
        version: 4,
    },
    "0000012345052": {
        id: 1234505,
        version: 1,
    },
    '{"barcode_id":1234505,"product_id":44205,"ff_user_id":297}': {
        id: 1234505,
        version: 2,
    },
    "1234505_44205_297": {
        id: 1234505,
        version: 3,
    },
    B_1234505_44205_297: {
        id: 1234505,
        version: 4,
    },
    "0000014130540": {
        id: 1413054,
        version: 1,
    },
    '{"barcode_id":1413054,"product_id":59574,"ff_user_id":380}': {
        id: 1413054,
        version: 2,
    },
    "1413054_59574_380": {
        id: 1413054,
        version: 3,
    },
    B_1413054_59574_380: {
        id: 1413054,
        version: 4,
    },
    "0000014130557": {
        id: 1413055,
        version: 1,
    },
    '{"barcode_id":1413055,"product_id":59574,"ff_user_id":380}': {
        id: 1413055,
        version: 2,
    },
    "1413055_59574_380": {
        id: 1413055,
        version: 3,
    },
    B_1413055_59574_380: {
        id: 1413055,
        version: 4,
    },
    "0000014130564": {
        id: 1413056,
        version: 1,
    },
    '{"barcode_id":1413056,"product_id":59574,"ff_user_id":380}': {
        id: 1413056,
        version: 2,
    },
    "1413056_59574_380": {
        id: 1413056,
        version: 3,
    },
    B_1413056_59574_380: {
        id: 1413056,
        version: 4,
    },
    "0000014130571": {
        id: 1413057,
        version: 1,
    },
    '{"barcode_id":1413057,"product_id":59574,"ff_user_id":380}': {
        id: 1413057,
        version: 2,
    },
    "1413057_59574_380": {
        id: 1413057,
        version: 3,
    },
    B_1413057_59574_380: {
        id: 1413057,
        version: 4,
    },
    "0000014130588": {
        id: 1413058,
        version: 1,
    },
    '{"barcode_id":1413058,"product_id":59574,"ff_user_id":380}': {
        id: 1413058,
        version: 2,
    },
    "1413058_59574_380": {
        id: 1413058,
        version: 3,
    },
    B_1413058_59574_380: {
        id: 1413058,
        version: 4,
    },
    "0000014130595": {
        id: 1413059,
        version: 1,
    },
    '{"barcode_id":1413059,"product_id":59574,"ff_user_id":380}': {
        id: 1413059,
        version: 2,
    },
    "1413059_59574_380": {
        id: 1413059,
        version: 3,
    },
    B_1413059_59574_380: {
        id: 1413059,
        version: 4,
    },
    "0000014130601": {
        id: 1413060,
        version: 1,
    },
    '{"barcode_id":1413060,"product_id":59574,"ff_user_id":380}': {
        id: 1413060,
        version: 2,
    },
    "1413060_59574_380": {
        id: 1413060,
        version: 3,
    },
    B_1413060_59574_380: {
        id: 1413060,
        version: 4,
    },
    "0000014130618": {
        id: 1413061,
        version: 1,
    },
    '{"barcode_id":1413061,"product_id":59574,"ff_user_id":380}': {
        id: 1413061,
        version: 2,
    },
    "1413061_59574_380": {
        id: 1413061,
        version: 3,
    },
    B_1413061_59574_380: {
        id: 1413061,
        version: 4,
    },
    "0000014130625": {
        id: 1413062,
        version: 1,
    },
    '{"barcode_id":1413062,"product_id":59574,"ff_user_id":380}': {
        id: 1413062,
        version: 2,
    },
    "1413062_59574_380": {
        id: 1413062,
        version: 3,
    },
    B_1413062_59574_380: {
        id: 1413062,
        version: 4,
    },
    "0000014130632": {
        id: 1413063,
        version: 1,
    },
    '{"barcode_id":1413063,"product_id":59574,"ff_user_id":380}': {
        id: 1413063,
        version: 2,
    },
    "1413063_59574_380": {
        id: 1413063,
        version: 3,
    },
    B_1413063_59574_380: {
        id: 1413063,
        version: 4,
    },
    "0000014130649": {
        id: 1413064,
        version: 1,
    },
    '{"barcode_id":1413064,"product_id":59574,"ff_user_id":380}': {
        id: 1413064,
        version: 2,
    },
    "1413064_59574_380": {
        id: 1413064,
        version: 3,
    },
    B_1413064_59574_380: {
        id: 1413064,
        version: 4,
    },
    "0000014130656": {
        id: 1413065,
        version: 1,
    },
    '{"barcode_id":1413065,"product_id":59574,"ff_user_id":380}': {
        id: 1413065,
        version: 2,
    },
    "1413065_59574_380": {
        id: 1413065,
        version: 3,
    },
    B_1413065_59574_380: {
        id: 1413065,
        version: 4,
    },
    "0000014130663": {
        id: 1413066,
        version: 1,
    },
    '{"barcode_id":1413066,"product_id":59574,"ff_user_id":380}': {
        id: 1413066,
        version: 2,
    },
    "1413066_59574_380": {
        id: 1413066,
        version: 3,
    },
    B_1413066_59574_380: {
        id: 1413066,
        version: 4,
    },
    "0000014130670": {
        id: 1413067,
        version: 1,
    },
    '{"barcode_id":1413067,"product_id":59574,"ff_user_id":380}': {
        id: 1413067,
        version: 2,
    },
    "1413067_59574_380": {
        id: 1413067,
        version: 3,
    },
    B_1413067_59574_380: {
        id: 1413067,
        version: 4,
    },
    "0000014130687": {
        id: 1413068,
        version: 1,
    },
    '{"barcode_id":1413068,"product_id":59574,"ff_user_id":380}': {
        id: 1413068,
        version: 2,
    },
    "1413068_59574_380": {
        id: 1413068,
        version: 3,
    },
    B_1413068_59574_380: {
        id: 1413068,
        version: 4,
    },
    "0000014130694": {
        id: 1413069,
        version: 1,
    },
    '{"barcode_id":1413069,"product_id":59574,"ff_user_id":380}': {
        id: 1413069,
        version: 2,
    },
    "1413069_59574_380": {
        id: 1413069,
        version: 3,
    },
    B_1413069_59574_380: {
        id: 1413069,
        version: 4,
    },
    "0000014130700": {
        id: 1413070,
        version: 1,
    },
    '{"barcode_id":1413070,"product_id":59574,"ff_user_id":380}': {
        id: 1413070,
        version: 2,
    },
    "1413070_59574_380": {
        id: 1413070,
        version: 3,
    },
    B_1413070_59574_380: {
        id: 1413070,
        version: 4,
    },
    "0000014130717": {
        id: 1413071,
        version: 1,
    },
    '{"barcode_id":1413071,"product_id":59574,"ff_user_id":380}': {
        id: 1413071,
        version: 2,
    },
    "1413071_59574_380": {
        id: 1413071,
        version: 3,
    },
    B_1413071_59574_380: {
        id: 1413071,
        version: 4,
    },
    "0000014130724": {
        id: 1413072,
        version: 1,
    },
    '{"barcode_id":1413072,"product_id":59574,"ff_user_id":380}': {
        id: 1413072,
        version: 2,
    },
    "1413072_59574_380": {
        id: 1413072,
        version: 3,
    },
    B_1413072_59574_380: {
        id: 1413072,
        version: 4,
    },
    "0000014130731": {
        id: 1413073,
        version: 1,
    },
    '{"barcode_id":1413073,"product_id":59574,"ff_user_id":380}': {
        id: 1413073,
        version: 2,
    },
    "1413073_59574_380": {
        id: 1413073,
        version: 3,
    },
    B_1413073_59574_380: {
        id: 1413073,
        version: 4,
    },
    "0000014130748": {
        id: 1413074,
        version: 1,
    },
    '{"barcode_id":1413074,"product_id":59574,"ff_user_id":380}': {
        id: 1413074,
        version: 2,
    },
    "1413074_59574_380": {
        id: 1413074,
        version: 3,
    },
    B_1413074_59574_380: {
        id: 1413074,
        version: 4,
    },
    "0000014130755": {
        id: 1413075,
        version: 1,
    },
    '{"barcode_id":1413075,"product_id":59574,"ff_user_id":380}': {
        id: 1413075,
        version: 2,
    },
    "1413075_59574_380": {
        id: 1413075,
        version: 3,
    },
    B_1413075_59574_380: {
        id: 1413075,
        version: 4,
    },
    "0000014130762": {
        id: 1413076,
        version: 1,
    },
    '{"barcode_id":1413076,"product_id":59574,"ff_user_id":380}': {
        id: 1413076,
        version: 2,
    },
    "1413076_59574_380": {
        id: 1413076,
        version: 3,
    },
    B_1413076_59574_380: {
        id: 1413076,
        version: 4,
    },
    "0000014130786": {
        id: 1413078,
        version: 1,
    },
    '{"barcode_id":1413078,"product_id":59574,"ff_user_id":380}': {
        id: 1413078,
        version: 2,
    },
    "1413078_59574_380": {
        id: 1413078,
        version: 3,
    },
    B_1413078_59574_380: {
        id: 1413078,
        version: 4,
    },
    "0000014130793": {
        id: 1413079,
        version: 1,
    },
    '{"barcode_id":1413079,"product_id":59574,"ff_user_id":380}': {
        id: 1413079,
        version: 2,
    },
    "1413079_59574_380": {
        id: 1413079,
        version: 3,
    },
    B_1413079_59574_380: {
        id: 1413079,
        version: 4,
    },
    "0000014130823": {
        id: 1413082,
        version: 1,
    },
    '{"barcode_id":1413082,"product_id":59574,"ff_user_id":380}': {
        id: 1413082,
        version: 2,
    },
    "1413082_59574_380": {
        id: 1413082,
        version: 3,
    },
    B_1413082_59574_380: {
        id: 1413082,
        version: 4,
    },
    "0000014130830": {
        id: 1413083,
        version: 1,
    },
    '{"barcode_id":1413083,"product_id":59574,"ff_user_id":380}': {
        id: 1413083,
        version: 2,
    },
    "1413083_59574_380": {
        id: 1413083,
        version: 3,
    },
    B_1413083_59574_380: {
        id: 1413083,
        version: 4,
    },
    "0000014130847": {
        id: 1413084,
        version: 1,
    },
    '{"barcode_id":1413084,"product_id":59574,"ff_user_id":380}': {
        id: 1413084,
        version: 2,
    },
    "1413084_59574_380": {
        id: 1413084,
        version: 3,
    },
    B_1413084_59574_380: {
        id: 1413084,
        version: 4,
    },
    "0000014130854": {
        id: 1413085,
        version: 1,
    },
    '{"barcode_id":1413085,"product_id":59574,"ff_user_id":380}': {
        id: 1413085,
        version: 2,
    },
    "1413085_59574_380": {
        id: 1413085,
        version: 3,
    },
    B_1413085_59574_380: {
        id: 1413085,
        version: 4,
    },
    "0000014130861": {
        id: 1413086,
        version: 1,
    },
    '{"barcode_id":1413086,"product_id":59574,"ff_user_id":380}': {
        id: 1413086,
        version: 2,
    },
    "1413086_59574_380": {
        id: 1413086,
        version: 3,
    },
    B_1413086_59574_380: {
        id: 1413086,
        version: 4,
    },
    "0000014130878": {
        id: 1413087,
        version: 1,
    },
    '{"barcode_id":1413087,"product_id":59574,"ff_user_id":380}': {
        id: 1413087,
        version: 2,
    },
    "1413087_59574_380": {
        id: 1413087,
        version: 3,
    },
    B_1413087_59574_380: {
        id: 1413087,
        version: 4,
    },
    "0000014130892": {
        id: 1413089,
        version: 1,
    },
    '{"barcode_id":1413089,"product_id":59574,"ff_user_id":380}': {
        id: 1413089,
        version: 2,
    },
    "1413089_59574_380": {
        id: 1413089,
        version: 3,
    },
    B_1413089_59574_380: {
        id: 1413089,
        version: 4,
    },
    "0000014130908": {
        id: 1413090,
        version: 1,
    },
    '{"barcode_id":1413090,"product_id":59574,"ff_user_id":380}': {
        id: 1413090,
        version: 2,
    },
    "1413090_59574_380": {
        id: 1413090,
        version: 3,
    },
    B_1413090_59574_380: {
        id: 1413090,
        version: 4,
    },
    "0000014130915": {
        id: 1413091,
        version: 1,
    },
    '{"barcode_id":1413091,"product_id":59574,"ff_user_id":380}': {
        id: 1413091,
        version: 2,
    },
    "1413091_59574_380": {
        id: 1413091,
        version: 3,
    },
    B_1413091_59574_380: {
        id: 1413091,
        version: 4,
    },
    "0000014130922": {
        id: 1413092,
        version: 1,
    },
    '{"barcode_id":1413092,"product_id":59574,"ff_user_id":380}': {
        id: 1413092,
        version: 2,
    },
    "1413092_59574_380": {
        id: 1413092,
        version: 3,
    },
    B_1413092_59574_380: {
        id: 1413092,
        version: 4,
    },
    "0000014130939": {
        id: 1413093,
        version: 1,
    },
    '{"barcode_id":1413093,"product_id":59574,"ff_user_id":380}': {
        id: 1413093,
        version: 2,
    },
    "1413093_59574_380": {
        id: 1413093,
        version: 3,
    },
    B_1413093_59574_380: {
        id: 1413093,
        version: 4,
    },
    "0000014130946": {
        id: 1413094,
        version: 1,
    },
    '{"barcode_id":1413094,"product_id":59574,"ff_user_id":380}': {
        id: 1413094,
        version: 2,
    },
    "1413094_59574_380": {
        id: 1413094,
        version: 3,
    },
    B_1413094_59574_380: {
        id: 1413094,
        version: 4,
    },
    "0000014130953": {
        id: 1413095,
        version: 1,
    },
    '{"barcode_id":1413095,"product_id":59574,"ff_user_id":380}': {
        id: 1413095,
        version: 2,
    },
    "1413095_59574_380": {
        id: 1413095,
        version: 3,
    },
    B_1413095_59574_380: {
        id: 1413095,
        version: 4,
    },
    "0000014130960": {
        id: 1413096,
        version: 1,
    },
    '{"barcode_id":1413096,"product_id":59574,"ff_user_id":380}': {
        id: 1413096,
        version: 2,
    },
    "1413096_59574_380": {
        id: 1413096,
        version: 3,
    },
    B_1413096_59574_380: {
        id: 1413096,
        version: 4,
    },
    "0000014130977": {
        id: 1413097,
        version: 1,
    },
    '{"barcode_id":1413097,"product_id":59574,"ff_user_id":380}': {
        id: 1413097,
        version: 2,
    },
    "1413097_59574_380": {
        id: 1413097,
        version: 3,
    },
    B_1413097_59574_380: {
        id: 1413097,
        version: 4,
    },
    "0000014130984": {
        id: 1413098,
        version: 1,
    },
    '{"barcode_id":1413098,"product_id":59574,"ff_user_id":380}': {
        id: 1413098,
        version: 2,
    },
    "1413098_59574_380": {
        id: 1413098,
        version: 3,
    },
    B_1413098_59574_380: {
        id: 1413098,
        version: 4,
    },
    "0000014130991": {
        id: 1413099,
        version: 1,
    },
    '{"barcode_id":1413099,"product_id":59574,"ff_user_id":380}': {
        id: 1413099,
        version: 2,
    },
    "1413099_59574_380": {
        id: 1413099,
        version: 3,
    },
    B_1413099_59574_380: {
        id: 1413099,
        version: 4,
    },
    "0000014131004": {
        id: 1413100,
        version: 1,
    },
    '{"barcode_id":1413100,"product_id":59574,"ff_user_id":380}': {
        id: 1413100,
        version: 2,
    },
    "1413100_59574_380": {
        id: 1413100,
        version: 3,
    },
    B_1413100_59574_380: {
        id: 1413100,
        version: 4,
    },
    "0000018393057": {
        id: 1839305,
        version: 1,
    },
    '{"barcode_id":1839305,"product_id":68716,"ff_user_id":352}': {
        id: 1839305,
        version: 2,
    },
    "1839305_68716_352": {
        id: 1839305,
        version: 3,
    },
    B_1839305_68716_352: {
        id: 1839305,
        version: 4,
    },
    "0000022305039": {
        id: 2230503,
        version: 1,
    },
    '{"barcode_id":2230503,"product_id":75427,"ff_user_id":164}': {
        id: 2230503,
        version: 2,
    },
    "2230503_75427_164": {
        id: 2230503,
        version: 3,
    },
    B_2230503_75427_164: {
        id: 2230503,
        version: 4,
    },
    "0000022305046": {
        id: 2230504,
        version: 1,
    },
    '{"barcode_id":2230504,"product_id":75427,"ff_user_id":164}': {
        id: 2230504,
        version: 2,
    },
    "2230504_75427_164": {
        id: 2230504,
        version: 3,
    },
    B_2230504_75427_164: {
        id: 2230504,
        version: 4,
    },
    "0000022305077": {
        id: 2230507,
        version: 1,
    },
    '{"barcode_id":2230507,"product_id":75427,"ff_user_id":164}': {
        id: 2230507,
        version: 2,
    },
    "2230507_75427_164": {
        id: 2230507,
        version: 3,
    },
    B_2230507_75427_164: {
        id: 2230507,
        version: 4,
    },
    "0000022305084": {
        id: 2230508,
        version: 1,
    },
    '{"barcode_id":2230508,"product_id":75427,"ff_user_id":164}': {
        id: 2230508,
        version: 2,
    },
    "2230508_75427_164": {
        id: 2230508,
        version: 3,
    },
    B_2230508_75427_164: {
        id: 2230508,
        version: 4,
    },
    "0000022305091": {
        id: 2230509,
        version: 1,
    },
    '{"barcode_id":2230509,"product_id":75427,"ff_user_id":164}': {
        id: 2230509,
        version: 2,
    },
    "2230509_75427_164": {
        id: 2230509,
        version: 3,
    },
    B_2230509_75427_164: {
        id: 2230509,
        version: 4,
    },
    "0000022305107": {
        id: 2230510,
        version: 1,
    },
    '{"barcode_id":2230510,"product_id":75427,"ff_user_id":164}': {
        id: 2230510,
        version: 2,
    },
    "2230510_75427_164": {
        id: 2230510,
        version: 3,
    },
    B_2230510_75427_164: {
        id: 2230510,
        version: 4,
    },
    "0000022305121": {
        id: 2230512,
        version: 1,
    },
    '{"barcode_id":2230512,"product_id":75427,"ff_user_id":164}': {
        id: 2230512,
        version: 2,
    },
    "2230512_75427_164": {
        id: 2230512,
        version: 3,
    },
    B_2230512_75427_164: {
        id: 2230512,
        version: 4,
    },
    "0000022305138": {
        id: 2230513,
        version: 1,
    },
    '{"barcode_id":2230513,"product_id":75427,"ff_user_id":164}': {
        id: 2230513,
        version: 2,
    },
    "2230513_75427_164": {
        id: 2230513,
        version: 3,
    },
    B_2230513_75427_164: {
        id: 2230513,
        version: 4,
    },
    "0000022305152": {
        id: 2230515,
        version: 1,
    },
    '{"barcode_id":2230515,"product_id":75427,"ff_user_id":164}': {
        id: 2230515,
        version: 2,
    },
    "2230515_75427_164": {
        id: 2230515,
        version: 3,
    },
    B_2230515_75427_164: {
        id: 2230515,
        version: 4,
    },
    "0000022305176": {
        id: 2230517,
        version: 1,
    },
    '{"barcode_id":2230517,"product_id":75427,"ff_user_id":164}': {
        id: 2230517,
        version: 2,
    },
    "2230517_75427_164": {
        id: 2230517,
        version: 3,
    },
    B_2230517_75427_164: {
        id: 2230517,
        version: 4,
    },
    "0000024902953": {
        id: 2490295,
        version: 1,
    },
    '{"barcode_id":2490295,"product_id":78282,"ff_user_id":259}': {
        id: 2490295,
        version: 2,
    },
    "2490295_78282_259": {
        id: 2490295,
        version: 3,
    },
    B_2490295_78282_259: {
        id: 2490295,
        version: 4,
    },
    "0000024902984": {
        id: 2490298,
        version: 1,
    },
    '{"barcode_id":2490298,"product_id":78282,"ff_user_id":259}': {
        id: 2490298,
        version: 2,
    },
    "2490298_78282_259": {
        id: 2490298,
        version: 3,
    },
    B_2490298_78282_259: {
        id: 2490298,
        version: 4,
    },
    "0000024903042": {
        id: 2490304,
        version: 1,
    },
    '{"barcode_id":2490304,"product_id":78282,"ff_user_id":259}': {
        id: 2490304,
        version: 2,
    },
    "2490304_78282_259": {
        id: 2490304,
        version: 3,
    },
    B_2490304_78282_259: {
        id: 2490304,
        version: 4,
    },
    "0000037443498": {
        id: 3744349,
        version: 1,
    },
    '{"barcode_id":3744349,"product_id":75427,"ff_user_id":164}': {
        id: 3744349,
        version: 2,
    },
    "3744349_75427_164": {
        id: 3744349,
        version: 3,
    },
    B_3744349_75427_164: {
        id: 3744349,
        version: 4,
    },
    "0000037443504": {
        id: 3744350,
        version: 1,
    },
    '{"barcode_id":3744350,"product_id":75427,"ff_user_id":164}': {
        id: 3744350,
        version: 2,
    },
    "3744350_75427_164": {
        id: 3744350,
        version: 3,
    },
    B_3744350_75427_164: {
        id: 3744350,
        version: 4,
    },
    "0000037443511": {
        id: 3744351,
        version: 1,
    },
    '{"barcode_id":3744351,"product_id":75427,"ff_user_id":164}': {
        id: 3744351,
        version: 2,
    },
    "3744351_75427_164": {
        id: 3744351,
        version: 3,
    },
    B_3744351_75427_164: {
        id: 3744351,
        version: 4,
    },
    "0000037443528": {
        id: 3744352,
        version: 1,
    },
    '{"barcode_id":3744352,"product_id":75427,"ff_user_id":164}': {
        id: 3744352,
        version: 2,
    },
    "3744352_75427_164": {
        id: 3744352,
        version: 3,
    },
    B_3744352_75427_164: {
        id: 3744352,
        version: 4,
    },
};

const message: MessageWithStorageType<
    RepositoryTypes<typeof rpcRepository>,
    RpcStorageType
>[] = [
    {
        type: "barcode_code",
        payload: testBarcodes,
    },
];

rpcRepository.handleMessages(message);

setTimeout(() => {
    console.log("adsd");

    //@ts-ignore
    rpcRepository.mergeRpc("cell_test", [
        {
            type: "cell_test",
            payload: [
                {
                    code: "A-1",
                    children: [],
                    id: 22,
                    is_stretched: false,
                    name: "Cell A",
                    parent_cell_id: null,
                    type: "shelf",
                    warehouse_id: 100,
                    products: [
                        {
                            id: 15,
                            barcodes: [{ id: 10 }],
                        },
                    ],
                },
                {
                    code: "A-1",
                    children: [],
                    id: 10,
                    is_stretched: false,
                    name: "Cell A",
                    parent_cell_id: null,
                    type: "shelf",
                    warehouse_id: 100,
                    products: [
                        {
                            id: 15,
                            barcodes: [{ id: 10 }],
                        },
                    ],
                },
                {
                    code: "A-1",
                    children: [],
                    id: 13213120,
                    is_stretched: false,
                    name: "Cell A",
                    parent_cell_id: null,
                    type: "shelf",
                    warehouse_id: 100,
                    products: [
                        {
                            id: 15,
                            barcodes: [{ id: 10 }],
                        },
                    ],
                },
            ],
        },
    ]);
}, 2000);

rpcRepository.handleMessages([
    {
        type: "cell_test",
        payload: [
            {
                code: "A-1",
                children: [],
                id: 22,
                is_stretched: false,
                name: "Cell A",
                parent_cell_id: null,
                type: "shelf",
                warehouse_id: 100,
                products: [
                    {
                        id: 15,
                        barcodes: [{ id: 10 }],
                    },
                ],
            },
            {
                code: "A-1",
                children: [],
                id: 10,
                is_stretched: false,
                name: "Cell A",
                parent_cell_id: null,
                type: "shelf",
                warehouse_id: 100,
                products: [
                    {
                        id: 15,
                        barcodes: [{ id: 10 }],
                    },
                ],
            },
            {
                code: "A-1",
                children: [],
                id: 13213120,
                is_stretched: false,
                name: "Cell A",
                parent_cell_id: null,
                type: "shelf",
                warehouse_id: 100,
                products: [
                    {
                        id: 15,
                        barcodes: [{ id: 10 }],
                    },
                ],
            },
        ],
    },
]);

rpcRepository.onDataChanged<RpcStorageType, ["cell_test"]>(
    (events) => {
        console.log(events);
    },
    {
        types: ["cell_test"],
    }
);
