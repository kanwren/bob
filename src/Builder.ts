const _builderSymbol = Symbol();

export type Builder<C, T, S extends Partial<T> = {}> = {
    [K in keyof T]-?: (value: T[K]) => Builder<C, T, S & Pick<T, K>>;
} & {
    build(this: Builder<C, T, T>): C;
    // Builder has to use 'S', or else the structural checking of ths 'this' above doesn't work
    // Using a symbol hides this field from code completion
    readonly [_builderSymbol]: S;
};

export function builderDef<T, S extends Partial<T>>(template: S): Builder<T, T, S>;
export function builderDef<C, T, S extends Partial<T>>(template: S, ctor: (fields: T) => C): Builder<C, T, S>;
export function builderDef<C, T, S extends Partial<T>>(template: S, ctor?: (fields: T) => C): Builder<C, T, S> {
    const base = { ...template };
    const handler = new Proxy(base, {
        // These awful types are fine, because the Proxy doesn't reflect in the
        // types when doing accesses, due to the type assertion
        get(target: any, prop: keyof T): Function {
            if (prop === 'build') {
                if (ctor) {
                    return () => ctor(target);
                } else {
                    return () => target;
                }
            } else {
                return (x: T[typeof prop]): typeof handler => {
                    target[prop] = x;
                    return handler;
                };
            }
        }
    }) as Builder<C, T, S>;
    return handler;
}

export function builder<T>(): Builder<T, T>;
export function builder<C, T>(ctor: (fields: T) => C): Builder<C, T>;
export function builder<C, T>(ctor?: (fields: T) => C): Builder<C, T> {
    if (ctor) {
        return builderDef<C, T, {}>({}, ctor);
    } else {
        return builderDef<T, {}>({}) as unknown as Builder<C, T>;
    }
}

