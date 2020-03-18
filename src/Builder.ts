export type Builder<T, S extends Partial<T> = {}> = {
    [K in keyof T]-?: (value: T[K]) => Builder<T, S & Pick<T, K>>;
} & {
    // For some reason, if I change these types around, when not every required
    // field has been filled in, the compiler will either not complain at all,
    // or throw five pages of errors.
    build(this: Builder<T, T>): S;
};

export function builderDef<T, S extends Partial<T>>(template: S): Builder<T, S> {
    const base = { ...template };
    const handler = new Proxy(base, {
        // These types are pretty wrong, but just ignore them for now, since
        // they don't really matter
        get(target: typeof base, prop: keyof T): (...args: any[]) => any {
            if (prop === 'build') {
                return () => target;
            } else {
                return (x: T[typeof prop]): typeof handler => {
                    (target as any)[prop] = x;
                    return handler;
                };
            }
        }
    }) as unknown as Builder<T, S>;
    return handler;
}

export function builder<T>(): Builder<T> {
    return builderDef<T, {}>({});
}

