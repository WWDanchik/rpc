import z from "zod";
import { Rpc } from "../core/rpc/Rpc";
import { RpcRepository, RepositoryTypes } from "../core/rpc/RpcRepository";
import { Message } from "../core/types";
import { log } from "console";

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

const cellRpc = new Rpc("cell", cellSchema, "cell_id");

const rectangleRpc = new Rpc("rectangle", rectangleSchema, "id");

const productRpc = new Rpc("product", productSchema, "id");

const settingsSchema = z.object({
    id: z.number(),
    theme: z.string(),
    language: z.string(),
    notifications: z.boolean(),
});

const settingsRpc = new Rpc("settings", settingsSchema);

const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc, { storageType: "collection" })
    .registerRpc("product", productRpc, { storageType: "collection" })
    .registerRpc("rectangle", rectangleRpc, { storageType: "collection" })
    .registerRpc("settings", settingsRpc, { storageType: "singleton" });

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

const relationTree = rpcRepository.getFullRelation();
console.log("Дерево связей:");
console.log(JSON.stringify(relationTree, null, 2));

const fullRelatedRectangleData = rpcRepository.getFullRelatedData(
    "rectangle",
    1
);
const fullRelatedCellData = rpcRepository.getFullRelatedData("cell", 1);
const allCellsWithRelations = rpcRepository.getFullRelatedData("cell");

console.log("Cell with relations:", fullRelatedCellData);
console.log("All cells with relations:", allCellsWithRelations);
const fullRelatedProductData = rpcRepository.getFullRelatedData("product", 1);

if (fullRelatedRectangleData) {
    console.log("Rectangle с полными данными:");
    console.log(JSON.stringify(fullRelatedRectangleData, null, 2));
}

if (fullRelatedCellData) {
    console.log("Cell с полными данными:");
    console.log(JSON.stringify(fullRelatedCellData, null, 2));
}

if (fullRelatedProductData) {
    console.log("Product с полными данными:");
    console.log(JSON.stringify(fullRelatedProductData, null, 2));
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
    hierarchicalCellRpc
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

console.log(
    JSON.stringify(
        cellRpc.createMessage({
            1: {
                cell_id: 1,
                cell_name: "Ячейка A1",
                cell_value: "CELL_000222222",
                is_stretched: true,
                products_ids: [{ id: 1 }],
            },
        }),
        null,
        2
    )
);

console.log(
    JSON.stringify(
        cellRpc.createMessage({
            1: {
                cell_id: 1,
                cell_name: "Ячейка A1",
                cell_value: "CELL_000222222",
                is_stretched: true,
                products_ids: [{ id: 1 }],
            },
        }),
        null,
        2
    )
);

const messages: Array<Message<RepositoryTypes<typeof rpcRepository>>> = [
    {
        type: "cell",
        payload: {
            1: {
                cell_id: 1,
                cell_name: "Обновленная ячейка A1",
                cell_value: "CELL_000333333",
                is_stretched: false,
                products_ids: [{ id: 1 }, { id: 2 }],
            },
            2: {
                cell_id: 2,
                cell_name: "Новая ячейка B1",
                cell_value: "CELL_000444444",
                is_stretched: true,
                products_ids: [{ id: 3 }],
            },
        },
    },
    {
        type: "rectangle",
        payload: {
            1: {
                id: 1,
                cell_ids: [{ id: 1 }, { id: 2 }],
                map_cells: {
                    pos_1_1: {
                        id: 101,
                        type: "pallet" as const,
                    },
                },
            },
        },
    },
    {
        type: "product",
        payload: [
            {
                id: 1,
                article: "ART003",
                name: "Продукт A",
                gravatar: "https://example.com/img3.jpg",
                barcode_ids: [{ id: 3001 }],
                is_stretched: false,
            },
            {
                id: 2,
                article: "ART004",
                name: "Продукт B",
                gravatar: "https://example.com/img4.jpg",
                barcode_ids: [{ id: 4001 }],
                is_stretched: true,
            },
            {
                id: 3,
                article: "ART005",
                name: "Продукт C",
                gravatar: "https://example.com/img5.jpg",
                barcode_ids: [{ id: 5001 }],
                is_stretched: false,
            },
        ],
    },
];

console.log("Обработка массива сообщений:");
rpcRepository.handleMessages(messages);

console.log("Состояние после обработки сообщений:");
console.log(JSON.stringify(rpcRepository.getState(), null, 2));

console.log("\n=== Система событий изменений данных ===");

const allChangesListenerId = rpcRepository.onDataChanged((events) => {
    console.log(`[Все изменения] получено ${events.length} событий:`);
    events.forEach((event) => {
        console.log(
            `  - ${String(event.type)}: ${event.payload.length} элементов`
        );
    });
});

const cellListenerId = rpcRepository.onDataChanged(
    (events) => {
        console.log(`[Ячейки] получено ${events.length} событий:`);
        events.forEach((event) => {
            console.log(
                `  - ${String(event.type)}: ${event.payload.length} элементов`
            );
        });
    },
    { types: ["cell"] }
);

const multiTypeListenerId = rpcRepository.onDataChanged(
    (events) => {
        console.log(`[Мульти-тип] получено ${events.length} событий:`);
        events.forEach((event) => {});
    },
    { types: ["cell", "product"] }
);

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

console.log("\n--- Обновление данных ---");
await rpcRepository.update("cell", 1, {
    cell_name: "Обновленная ячейка A1",
    cell_value: "CELL_000999999",
});

console.log("\n--- Удаление данных ---");
rpcRepository.remove("product", 2);

console.log("\n--- Очистка слушателей ---");
rpcRepository.offDataChanged(allChangesListenerId);
rpcRepository.offDataChanged(cellListenerId);
rpcRepository.offDataChanged(multiTypeListenerId);

console.log(
    "Количество активных слушателей после очистки:",
    rpcRepository.getDataChangedListenerCount()
);

console.log("\n=== Пример завершен ===");

console.log(
    JSON.stringify(
        cellRpc.createMessage({
            1: {
                cell_id: 1,
                cell_name: "Ячейка A1",
                cell_value: "CELL_000222222",
                is_stretched: true,
                products_ids: [{ id: 1 }],
            },
        }),
        null,
        2
    )
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
