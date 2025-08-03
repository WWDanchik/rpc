import { describe, it, expect } from "vitest";
import { RpcRepository } from "../core/rpc/RpcRepository";
import { Rpc } from "../core/rpc/Rpc";
import z from "zod";

describe("Integration Tests", () => {
    describe("Complete workflow with relations", () => {
        const userSchema = z.object({
            id: z.number(),
            name: z.string(),
            email: z.string().email(),
            post_ids: z.array(z.object({ id: z.number() })).optional(),
        });

        const postSchema = z.object({
            id: z.number(),
            title: z.string(),
            content: z.string(),
            userId: z.number(),
        });

        const tagSchema = z.object({
            id: z.number(),
            name: z.string(),
            color: z.string(),
        });

        const userRpc = new Rpc("user", userSchema, "id");
        const postRpc = new Rpc("post", postSchema, "id");
        const tagRpc = new Rpc("tag", tagSchema, "id");

        const repository = new RpcRepository()
            .registerRpc("user", userRpc)
            .registerRpc("post", postRpc)
            .registerRpc("tag", tagRpc);

        repository
            .defineRelation("user", "post", "posts")
            .hasMany({ field: "post_ids", key: "id" }, "id");



        it("should handle complete CRUD workflow with relations", () => {
            // Create users
            const user1 = repository.save("user", {
                id: 1,
                name: "John Doe",
                email: "john@example.com",
                post_ids: [{ id: 1 }, { id: 2 }],
            });

            const user2 = repository.save("user", {
                id: 2,
                name: "Jane Smith",
                email: "jane@example.com",
                post_ids: [{ id: 3 }],
            });

            // Create tags
            const techTag = repository.save("tag", {
                id: 1,
                name: "Technology",
                color: "#007bff",
            });

            const newsTag = repository.save("tag", {
                id: 2,
                name: "News",
                color: "#28a745",
            });

            // Create posts with relations
            const post1 = repository.save("post", {
                id: 1,
                title: "Getting Started with RPC",
                content: "This is a great introduction...",
                userId: 1,
            });

            const post2 = repository.save("post", {
                id: 2,
                title: "Advanced RPC Patterns",
                content: "Let's dive deeper...",
                userId: 1,
            });

            const post3 = repository.save("post", {
                id: 3,
                title: "Jane's First Post",
                content: "Hello world!",
                userId: 2,
            });

            // Test relations
            const johnsPosts = repository.getRelated("user", 1, "post");
            expect(johnsPosts).toHaveLength(2);
            expect(johnsPosts[0]?.title).toBe("Getting Started with RPC");
            expect(johnsPosts[1]?.title).toBe("Advanced RPC Patterns");

            const janesPosts = repository.getRelated("user", 2, "post");
            expect(janesPosts).toHaveLength(1);
            expect(janesPosts[0]?.title).toBe("Jane's First Post");

            const post1Tags = repository.getRelated("post", 1, "tag");
            expect(post1Tags).toHaveLength(0);

            // Test full related data
            const fullUserData = repository.getFullRelatedData("user", 1);
            expect(fullUserData).toBeDefined();
            expect((fullUserData as any).posts).toHaveLength(2);



            // Test merge
            const mergedPosts = repository.mergeRpc("post", {
                "1": { title: "Updated Title" },
                "4": {
                    id: 4,
                    title: "New Post",
                    content: "New content",
                    userId: 1,
                },
            });

            expect(mergedPosts).toHaveLength(4);


            const updatedPost = mergedPosts.find((post) => post.id === 1);
            const newPost = mergedPosts.find((post) => post.id === 4);

            expect(updatedPost?.title).toBe("Updated Title");
            expect(newPost?.title).toBe("New Post");

            // Test messages
            const messages = [
                {
                    type: "user" as const,
                    payload: {
                        "3": { id: 3, name: "Bob", email: "bob@example.com" },
                    },
                },
                {
                    type: "tag" as const,
                    payload: [{ id: 3, name: "Design", color: "#ffc107" }],
                },
            ];

            repository.handleMessages(messages);

            const allUsers = repository.findAll("user");
            expect(allUsers).toHaveLength(3);

            const allTags = repository.findAll("tag");
            expect(allTags).toHaveLength(3);
        });
    });

    describe("Complex relations with nested data", () => {
        const categorySchema = z.object({
            id: z.number(),
            name: z.string(),
            parentId: z.number().optional(),
            product_ids: z.array(z.object({ id: z.number() })).optional(),
        });

        const productSchema = z.object({
            id: z.number(),
            name: z.string(),
            categoryId: z.number(),
            variant_ids: z.array(z.object({ id: z.number() })).optional(),
        });

        const variantSchema = z.object({
            id: z.number(),
            name: z.string(),
            productId: z.number(),
        });

        const optionSchema = z.object({
            id: z.number(),
            name: z.string(),
            value: z.string(),
        });

        const categoryRpc = new Rpc("category", categorySchema, "id");
        const productRpc = new Rpc("product", productSchema, "id");
        const variantRpc = new Rpc("variant", variantSchema, "id");
        const optionRpc = new Rpc("option", optionSchema, "id");

        const repository = new RpcRepository()
            .registerRpc("category", categoryRpc)
            .registerRpc("product", productRpc)
            .registerRpc("variant", variantRpc)
            .registerRpc("option", optionRpc);

        repository
            .defineRelation("category", "product", "products")
            .hasMany({ field: "product_ids", key: "id" }, "id");

        repository
            .defineRelation("product", "variant", "variants")
            .hasMany({ field: "variant_ids", key: "id" }, "id");



        it("should handle deep nested relations", () => {
            // Create categories
            const electronics = repository.save("category", {
                id: 1,
                name: "Electronics",
                product_ids: [],
            });

            const phones = repository.save("category", {
                id: 2,
                name: "Phones",
                parentId: 1,
                product_ids: [{ id: 1 }, { id: 2 }],
            });

            // Create products
            const iphone = repository.save("product", {
                id: 1,
                name: "iPhone 15",
                categoryId: 2,
                variant_ids: [{ id: 1 }, { id: 2 }],
            });

            const samsung = repository.save("product", {
                id: 2,
                name: "Samsung Galaxy",
                categoryId: 2,
                variant_ids: [{ id: 3 }],
            });

            // Create variants
            const iphone128 = repository.save("variant", {
                id: 1,
                name: "128GB",
                productId: 1,
            });

            const iphone256 = repository.save("variant", {
                id: 2,
                name: "256GB",
                productId: 1,
            });

            const samsung128 = repository.save("variant", {
                id: 3,
                name: "128GB",
                productId: 2,
            });

            // Create options
            repository.save("option", { id: 1, name: "Color", value: "Black" });
            repository.save("option", {
                id: 2,
                name: "Storage",
                value: "128GB",
            });
            repository.save("option", {
                id: 3,
                name: "Storage",
                value: "256GB",
            });
            repository.save("option", { id: 4, name: "Color", value: "White" });

            // Test deep relations
            const phoneProducts = repository.getRelated(
                "category",
                2,
                "product"
            );
            expect(phoneProducts).toHaveLength(2);

            const iphoneVariants = repository.getRelated(
                "product",
                1,
                "variant"
            );
            expect(iphoneVariants).toHaveLength(2);

            const iphone128Options = repository.getRelated(
                "variant",
                1,
                "option"
            );
            expect(iphone128Options).toHaveLength(0);

            // Test full related data with deep nesting
            const fullCategoryData = repository.getFullRelatedData(
                "category",
                2
            );
            expect(fullCategoryData).toBeDefined();
            expect((fullCategoryData as any).products).toHaveLength(2);
            expect((fullCategoryData as any).products[0].variants).toHaveLength(
                2
            );
        });
    });

    describe("Error handling and edge cases", () => {
        const simpleSchema = z.object({
            id: z.number(),
            name: z.string(),
        });

        const simpleRpc = new Rpc("simple", simpleSchema, "id");
        const repository = new RpcRepository().registerRpc("simple", simpleRpc);

        it("should handle invalid data gracefully", () => {
            expect(() => {
                repository.save("simple", { id: 1, name: "test" });
            }).not.toThrow();

            expect(() => {
                repository.save("simple", { id: 1 } as any);
            }).toThrow();
        });

        it("should handle non-existent types", () => {
            expect(() => {
                repository.save("nonExistent" as any, { id: 1, name: "test" });
            }).toThrow();
        });

        it("should handle empty arrays and objects", () => {
            // Save some data first
            repository.save("simple", { id: 1, name: "test" });

            const emptyArray = repository.mergeRpc("simple", []);
            expect(emptyArray).toHaveLength(1);

            const emptyObject = repository.mergeRpc("simple", {});
            expect(emptyObject).toHaveLength(1);
        });
    });
});
