(['moongate']).forEach(schema => {

    const user = `${schema}_user`;
    const password = `${schema}_password`;
    const schemaConfig = [
        {
            user: `${user}`,
            password: `${password}`,
            schemas: [`${schema}`]
        }
    ];
    schemaConfig.forEach(({ user, password, schemas }) => {

        const rolesDbOwner = schemas.map(schema => {
            return { role: "dbOwner", db: schema };
        });
        const rolesReadWrite = schemas.map(schema => {
            return { role: "readWrite", db: schema };
        });

        db.createUser({
            user,
            pwd: password,
            customData: {},
            roles: [
                ...rolesDbOwner,
                ...rolesReadWrite
            ],
            authenticationRestrictions: [
                {
                    clientSource: ["0.0.0.0/0"],
                    serverAddress: ["0.0.0.0/0"]
                }
            ],
            mechanisms: ["SCRAM-SHA-1", "SCRAM-SHA-256"],
            passwordDigestor: "server"
        });

    });

});
