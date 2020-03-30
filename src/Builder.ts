const initializedFields = Symbol();

/**
 * A 'Builder<C, T, S>' is an object that lets you sequentially build up fields
 * to construct an object of type 'C'. Type 'T' contains the fields that the
 * builder should be able to set, and 'S' contains the fields that have already
 * been initialized. A builder can be built when all required fields have been
 * initialized, which happens when 'T = S'.
 */
export type Builder<C, T = C, S extends Partial<T> = {}> = {
    // Builder has to use 'S', or else the structural checking of ths 'this'
    // above doesn't work. Using a symbol hides this field from code completion.
    // The compiler will report '[initializedFields]' as being incompatible
    readonly [initializedFields]: S;
} & {
    /**
     * Produce a completed value from the builder. This is only callable on a
     * builder when all fields have been filled in; that is, when it is of the
     * form 'Builder<C, T, T>'.
     */
    build(this: Builder<C, T, T>): C;
} & {
    // For each field, we provide a setter of the same name, ensuring that it is
    // not optional. Calling the setter returns a new builder that knows that
    // the corresponding field is initialized via 'S'.
    [K in keyof T]-?: (value: T[K]) => Builder<C, T, S & Pick<T, K>>;
};

/**
 * Creates a 'Builder' from a template that initializes some fields with default
 * values. Can optionally take a function as a second argument, specifying what
 * '.build()' should do with the initialized fields to create the desired type.
 * For constructing classes, this usually means passing the parameters to the
 * class's constructor.
 */
export function builderDef<T, S extends Partial<T>>(template: S): Builder<T, T, S>;
export function builderDef<C, T, S extends Partial<T>>(template: S, ctor: (fields: T) => C): Builder<C, T, S>;
export function builderDef<C, T, S extends Partial<T>>(template: S, ctor?: (fields: T) => C): Builder<C, T, S> {
    const base = { ...template };
    const handler = new Proxy(base, {
        // These awful types are fine, because the Proxy doesn't reflect in the
        // types when doing accesses, due to the type assertion
        get(target: any, prop: keyof T): Function {
            if (prop === "build") {
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

/**
 * Create an empty 'Builder' for a type. Can optionally take a function as a
 * second argument, specifying what '.build()' should do with the initialized
 * fields to create the desired type. For constructing classes, this usually
 * means passing the parameters to the class's constructor.
 */
export function builder<T>(): Builder<T, T>;
export function builder<C, T>(ctor: (fields: T) => C): Builder<C, T>;
export function builder<C, T>(ctor?: (fields: T) => C): Builder<C, T> {
    if (ctor) {
        return builderDef<C, T, {}>({}, ctor);
    } else {
        return builderDef<T, {}>({}) as unknown as Builder<C, T>;
    }
}

