import { z } from "zod";
import { StorageType } from "../types";
import { Rpc } from "../rpc/Rpc";

export type RpcStorageType = Record<string, StorageType>;

export type InferRpcType<T extends Rpc<any>> = T extends Rpc<infer S> ? z.infer<S> : never;

export type InferRpcTypes<TTypes extends Record<string, Rpc<any>>> = {
    [K in keyof TTypes]: TTypes[K] extends Rpc<infer S> ? z.infer<S> : never;
};

export type CollectionKeys<TStorageType extends RpcStorageType> = {
    [K in keyof TStorageType]: TStorageType[K] extends "collection" ? K : never;
}[keyof TStorageType];

export type SingletonKeys<TStorageType extends RpcStorageType> = {
    [K in keyof TStorageType]: TStorageType[K] extends "singleton" ? K : never;
}[keyof TStorageType];

export function createRpcStorageType<T extends RpcStorageType>(storageType: T): T {
    return storageType;
}

export function isCollection<TStorageType extends RpcStorageType, T extends keyof TStorageType>(
    storageType: TStorageType,
    key: T
): storageType is TStorageType & Record<T, "collection"> {
    return storageType[key] === "collection";
}

export function isSingleton<TStorageType extends RpcStorageType, T extends keyof TStorageType>(
    storageType: TStorageType,
    key: T
): storageType is TStorageType & Record<T, "singleton"> {
    return storageType[key] === "singleton";
}
