# bob

Super typesafe, boilerplate-free builders for TypeScript.

## Motivation

Builders are a very useful for declaratively constructing complex objects.

```typescript
type User = {
    email: string;
    id: number;
};

class UserBuilder {
    private obj: Partial<User> = {};

    setEmail(email: string): UserBuilder {
        obj.email = email;
        return this;
    }

    setId(id: number): UserBuilder {
        obj.id = id;
        return this;
    }

    build(): User {
        return obj as User;
    };
}

const user = new UserBuilder()
    .setEmail("foo@example.com")
    .setId(999)
    .build();
```

Unfortunately, there are a few problems with the above. Firstly, it's not very
typesafe; if we don't provide all of the required fields, then we don't find out
until runtime, due to the unsafe `as User` type assertion:

```typescript
const user = new UserBuilder()
    .setEmail("foo@example.com")
    .build();
console.log(user.id); // undefined!
```

Fortunately, there are many ways that we can take advantage of TypeScript's
structural type system to increase our type safety:

```typescript
type User = {
    email: string;
    id: number;
};

class UserBuilder implements Partial<User> {
    email?: string;
    id?: number;

    setEmail(email: string): UserBuilder & Pick<User, "email"> {
        this.email = email;
        return this;
    }

    setId(id: number): UserBuilder & Pick<User, "id"> {
        this.id = id;
        return this;
    }

    build(this: User): User {
        return {
            email: this.email,
            id: this.id
        };
    };
}

// Fails to compile, missing 'id'
const user = new UserBuilder()
    .setEmail("foo@example.com")
    .build();
```

Much better! However, this is a lot of boilerplate; it would be a pain to write
a builder for all of our types. Libraries such as
[builder-pattern](https://github.com/Vincent-Pang/builder-pattern) take
advantage of `Proxy` to automatically create a builder for you, using the
proxy's handler to set the necessary fields. This would let you write something
like the following (using `bob`'s syntax):

```typescript
const user = builder<User>()
    .email("foo@example.com")
    .id(999)
    .build();
```

`bob` combines these two approaches, allowing you to make flexible and typesafe
builders without all of the regular boilerplate.

## Usage

To automatically make a builder for your type, use `builder`:

```typescript
type User = {
    email: string;
    id: number;
    age?: number;
};

const user1 = builder<User>()
    .email("foo@example.com")
    .id(999)
    .age(20)
    .build();

// Optional fields work as expected
const user2 = builder<User>()
    .email("foo@example.com")
    .id(999)
    .build();

// Compile error! Builder missing required field 'email'
const user2 = builder<User>()
    .id(999)
    .build();
```

Of course, you can make a function to generate the builders of the desired type
for you:

```typescript
function userBuilder(): Builder<User> = {
    return builder<User>();
}

const user = userBuilder()
    .email("foo@example.com")
    .id(999)
    .build();
```

To make a builder with default values, use `builderDef`:

```typescript
function userBuilder(): Builder<User, { id: number }> {
    return builder({ id: 0 });
}

const user1 = userBuilder()
    .email("foo@example.com")
    .build();

// Can override defaults if necessary
const user2 = userBuilder()
    .email("foo@example.com")
    .id(999)
    .build();
```

To make an instance out of the built fields, `builder` and `builderDef` can
optionally accept a function as a second argument, which lets you specify how to
construct an instance out of the fields you've built:

```typescript
class User {
    constructor(
        public readonly email: string,
        public readonly id: number,
    ) {}

    // The first type parameter is the result of .build()
    // The second type parameter is the fields that the builder should have
    static builder(): Builder<User, { email: string; id: number; }> {
        return builder(({ email, id }) => new User(email, id));
    }
}

const user: User = User.builder()
    .email("foo@example.com")
    .id(999)
    .build();
```

