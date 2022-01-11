/*
 Navicat Premium Data Transfer

 Source Server         : AWS
 Source Server Type    : MongoDB
 Source Server Version : 50005
 Source Host           : 13.124.191.1:17017
 Source Schema         : moongate

 Target Server Type    : MongoDB
 Target Server Version : 50005
 File Encoding         : 65001

 Date: 10/01/2022 22:50:16
*/


// ----------------------------
// Collection structure for Counter
// ----------------------------
db.getCollection("Counter").drop();
db.createCollection("Counter");

// ----------------------------
// Documents of Counter
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("Counter").insert([ {
    _id: ObjectId("610ffbf869bfe4a1b6f9336c"),
    collection: "Order",
    value: NumberInt("2")
} ]);
session.commitTransaction(); session.endSession();

// ----------------------------
// Collection structure for Investment
// ----------------------------
db.getCollection("Investment").drop();
db.createCollection("Investment");

// ----------------------------
// Documents of Investment
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("Investment").insert([ {
    _id: ObjectId("60fe6f9169bfe44daff93369"),
    userId: "5f5eeb2d-bb41-4b0e-ae0a-a45569881529",
    purchasedTotal: NumberDecimal("0"),
    releasedTotal: NumberDecimal("0"),
    lockedTotal: NumberDecimal("0")
}, {
    _id: ObjectId("60fef4bf69bfe45722f9336a"),
    userId: "81a75ff6-da9f-43af-a01b-62cdaf9df110",
    purchasedTotal: NumberDecimal("0"),
    releasedTotal: NumberDecimal("0"),
    lockedTotal: NumberDecimal("0")
}, {
    _id: ObjectId("610ff6b769bfe45820f9336b"),
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    purchasedTotal: NumberDecimal("2000"),
    releasedTotal: NumberDecimal("200"),
    lockedTotal: NumberDecimal("1800")
}, {
    _id: ObjectId("61862fa86fbb1703d77e66ab"),
    userId: "d42500ef-5c5b-4837-a6fe-f192b1063888",
    purchasedTotal: NumberDecimal("0"),
    releasedTotal: NumberDecimal("0"),
    lockedTotal: NumberDecimal("0")
} ]);
session.commitTransaction(); session.endSession();

// ----------------------------
// Collection structure for MoongateUser
// ----------------------------
db.getCollection("MoongateUser").drop();
db.createCollection("MoongateUser");

// ----------------------------
// Documents of MoongateUser
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("MoongateUser").insert([ {
    _id: "5f5eeb2d-bb41-4b0e-ae0a-a45569881529",
    username: "user706812",
    email: "wujuntaocn@outlook.com",
    emailVerified: true,
    verificationToken: "71ea2166-f28d-405d-9cfa-c8bbd344b77a",
    createdAt: ISODate("2021-07-26T08:12:05Z"),
    updatedAt: ISODate("2022-01-10T14:36:57Z"),
    roles: [
        "admin"
    ],
    walletAddress: "hello",
    network: "BEP20"
}, {
    _id: "81a75ff6-da9f-43af-a01b-62cdaf9df110",
    username: "user974491",
    email: "filusdt@snapmail.cc",
    emailVerified: true,
    verificationToken: "a9eb99b2-6430-4a11-a712-af828e5bea15",
    createdAt: ISODate("2021-07-26T17:38:08Z"),
    updatedAt: ISODate("2021-07-26T18:02:06Z"),
    locked: null,
    realm: null,
    resetCount: NumberInt("1"),
    resetKey: "",
    resetKeyTimestamp: "",
    resetTimestamp: "7/26/2021",
    roles: null,
    walletAddress: null
}, {
    _id: "86baaa68-eae8-4099-9356-1ef9cfce6780",
    username: "user309121",
    email: "filbtc@snapmail.cc",
    emailVerified: false,
    verificationToken: "7a90220c-8946-4ef5-8893-43f079cc2dd4",
    createdAt: ISODate("2021-07-26T17:48:04Z"),
    locked: null,
    realm: null,
    resetCount: NumberInt("1"),
    resetKey: "2b04a0dd-da31-4b3d-a0d7-e90304550019",
    resetKeyTimestamp: "7/26/2021",
    resetTimestamp: "7/26/2021",
    roles: null,
    updatedAt: ISODate("2021-07-26T17:49:06Z"),
    walletAddress: null
}, {
    _id: "7c303133-bc0e-4bd3-8e3f-d569978b47e6",
    username: "user837205",
    email: "lereva@snapmail.cc",
    emailVerified: false,
    verificationToken: "c093f6fa-8081-4661-88d8-4c1c229c4117",
    createdAt: ISODate("2021-07-29T08:12:31Z")
}, {
    _id: "b5c4fb63-017c-4a01-915d-5fd8075eb5ad",
    username: "user688262",
    email: "juanaurich380@gmail.com",
    emailVerified: false,
    verificationToken: "18f965bb-6f73-44b6-afe9-287b7ac52be7",
    createdAt: ISODate("2021-07-29T08:16:35Z")
}, {
    _id: "6f5eeb2d-bb41-4b0e-ae0a-a45569881529",
    username: "user000012",
    email: "moongateadmin@protonmail.com",
    roles: [
        "admin"
    ],
    emailVerified: true,
    verificationToken: "6ce9d108-0baf-42b6-a2d8-3597da601cd5",
    createdAt: ISODate("2021-06-27T07:21:39Z"),
    locked: null,
    realm: null,
    resetCount: NumberInt("2"),
    resetKey: "",
    resetKeyTimestamp: "",
    resetTimestamp: "8/8/2021",
    updatedAt: ISODate("2021-08-08T15:18:34Z"),
    walletAddress: null
}, {
    _id: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    username: "user596278",
    email: "libpek@snapmail.cc",
    emailVerified: true,
    verificationToken: "ab14d189-d00a-448a-9666-f8a7c6092099",
    createdAt: ISODate("2021-08-08T15:22:22Z"),
    updatedAt: ISODate("2021-08-08T15:22:31Z")
}, {
    _id: "00d57fec-824f-4995-85f4-e4363b5bffc0",
    username: "user472239",
    email: "fatpigdao@snapmail.cc",
    emailVerified: false,
    verificationToken: "28f3ac34-cf54-4230-8baa-ad76d71d5d9a",
    createdAt: ISODate("2021-11-06T07:25:23Z")
}, {
    _id: "1a87a2b4-4317-42e4-a4db-6974a3ba7253",
    username: "user279052",
    email: "guild@snapmail.cc",
    emailVerified: false,
    verificationToken: "bbb6d999-6b58-4446-8d89-54dfe120c73a",
    createdAt: ISODate("2021-11-06T07:26:26Z")
}, {
    _id: "56f42fdc-2061-4b84-9b58-c26f4c70641e",
    username: "user713166",
    email: "wujuntaocn@qq.com",
    emailVerified: false,
    verificationToken: "dea78696-8657-432a-a96b-50fbe43db32d",
    createdAt: ISODate("2021-11-06T07:29:27Z")
}, {
    _id: "1128c4f2-cf1f-48e2-a3bb-82b68df1b838",
    username: "user366334",
    email: "wujuntaocn@gmail.com",
    emailVerified: false,
    verificationToken: "87b3c693-96f6-4123-a8c9-2a3b5d9a0a5e",
    createdAt: ISODate("2021-11-06T07:30:26Z")
}, {
    _id: "d42500ef-5c5b-4837-a6fe-f192b1063888",
    username: "user033897",
    email: "kingofmallorca@protonmail.com",
    emailVerified: true,
    verificationToken: "888e9b65-1270-471e-8a4d-2cdd28c587e3",
    createdAt: ISODate("2021-11-06T07:31:38Z"),
    updatedAt: ISODate("2022-01-10T14:39:11Z"),
    locked: null,
    network: null,
    realm: null,
    resetCount: NumberInt("2"),
    resetKey: "d3137e93-64c2-41ad-a2ca-0eb62071705e",
    resetKeyTimestamp: "1/10/2022",
    resetTimestamp: "1/10/2022",
    roles: null,
    walletAddress: null
}, {
    _id: "043ffbc0-84af-4872-b09d-a35a328ae349",
    username: "user588990",
    email: "312151845@qq.com",
    emailVerified: false,
    verificationToken: "ea6c8c79-8b93-489e-b906-eced4331ea96",
    createdAt: ISODate("2022-01-10T14:39:34Z")
} ]);
session.commitTransaction(); session.endSession();

// ----------------------------
// Collection structure for Order
// ----------------------------
db.getCollection("Order").drop();
db.createCollection("Order");

// ----------------------------
// Documents of Order
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("Order").insert([ {
    _id: ObjectId("610ffbf869bfe40acdf9336d"),
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    username: "user596278",
    orderType: "PURCHASE",
    amount: NumberDecimal("2000"),
    createDate: ISODate("2021-08-08T15:44:56Z"),
    status: "ACTIVE",
    recordNumber: "Order0000000001"
}, {
    _id: ObjectId("610ffc0369bfe4104cf9336f"),
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    username: "user596278",
    orderType: "RELEASE",
    amount: NumberDecimal("200"),
    createDate: ISODate("2021-08-08T15:45:07Z"),
    status: "ACTIVE",
    recordNumber: "Order0000000002"
} ]);
session.commitTransaction(); session.endSession();

// ----------------------------
// Collection structure for TransactionHistory
// ----------------------------
db.getCollection("TransactionHistory").drop();
db.createCollection("TransactionHistory");

// ----------------------------
// Documents of TransactionHistory
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("TransactionHistory").insert([ {
    _id: ObjectId("610ffbf869bfe47e18f9336e"),
    date: ISODate("2021-08-08T15:44:56Z"),
    activity: "PURCHASE",
    amount: NumberDecimal("2000"),
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    orderId: ObjectId("610ffbf869bfe40acdf9336d"),
    status: "ACTIVE"
}, {
    _id: ObjectId("610ffc0369bfe4f6d6f93370"),
    date: ISODate("2021-08-08T15:45:07Z"),
    activity: "RELEASE",
    amount: NumberDecimal("200"),
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2",
    orderId: ObjectId("610ffc0369bfe4104cf9336f"),
    status: "ACTIVE"
} ]);
session.commitTransaction(); session.endSession();

// ----------------------------
// Collection structure for UserCredentials
// ----------------------------
db.getCollection("UserCredentials").drop();
db.createCollection("UserCredentials");

// ----------------------------
// Documents of UserCredentials
// ----------------------------
session = db.getMongo().startSession();
session.startTransaction();
db = session.getDatabase("moongate");
db.getCollection("UserCredentials").insert([ {
    _id: "21101ccb-ad9c-4af0-b12b-ce47e269236d",
    password: "$2a$10$NHweCLeidwxakwrjbkNPyea7fwrc.8XE7qqG3tQ84Ap4011LtW8CK",
    userId: "5f5eeb2d-bb41-4b0e-ae0a-a45569881529"
}, {
    _id: "29f67f74-aad3-4823-b92a-0f81a4d80720",
    password: "$2a$10$Fo9/ZNSHTgtkkDweltrjcuepX7P6V.KIK0380qk3iId6boSwE8OvS",
    userId: "81a75ff6-da9f-43af-a01b-62cdaf9df110"
}, {
    _id: "c642c62d-7882-41ee-b82e-3caff8637b45",
    password: "$2a$10$xdXF7Fplt/xkqRWeCbl8E.Y7Pwe9Zk..6QVk0FneweXv/eLBaJzuu",
    userId: "86baaa68-eae8-4099-9356-1ef9cfce6780"
}, {
    _id: "9778ec54-d17c-4699-b528-4861aba0617a",
    password: "$2a$10$CMNI8VII3UD7rP1da2cItuBpgGBRFLG3F/nKoxvEMA/kTU7Pa85mu",
    userId: "7c303133-bc0e-4bd3-8e3f-d569978b47e6"
}, {
    _id: "41883103-1540-47c4-ae53-f9df5bb16941",
    password: "$2a$10$Swx.iMTpetu1cR2m2MKnJ.GwDVAhmAP6oByvHSCx3MOThweLXcdi2",
    userId: "b5c4fb63-017c-4a01-915d-5fd8075eb5ad"
}, {
    _id: ObjectId("610ff4bf02130000f9006932"),
    password: "$2a$10$Y9YFqgX4jch/rgRKVeEnjO1e.5FUHWd2haA4ICbW.y5nFOPa01LO.",
    userId: "6f5eeb2d-bb41-4b0e-ae0a-a45569881529"
}, {
    _id: "d8140aaa-1b1e-4ad4-baf4-8b899efca43f",
    password: "$2a$10$tD3cVhkkkcxPSZJ6bdJ2IOcEr1DHo.y.8FOQVAOVP2V3SXvZjuxW2",
    userId: "adcb9dc8-1f8b-418f-8625-407ae81c23f2"
}, {
    _id: "b931dd2f-829d-440e-8362-bafd33754f1d",
    password: "$2a$10$vfyA1fLQcDUVoq39app4k.iEx5L42g37OEvY/vNqPoyAwK34Jtiea",
    userId: "00d57fec-824f-4995-85f4-e4363b5bffc0"
}, {
    _id: "1638e1e6-a3ed-4147-895b-9f5194d2504a",
    password: "$2a$10$XFtqvk0wjjmuAxfIf7fqn.hlw6YkcU3Boir28vxBvioU19mjk2Lcy",
    userId: "1a87a2b4-4317-42e4-a4db-6974a3ba7253"
}, {
    _id: "3b14c482-87e6-4cdc-a4b8-f3d513d277dc",
    password: "$2a$10$aNmE.wSXgfusAp25Vkfj9.uwzKIoJGj/EAINI67H1yvnQbYX47i8W",
    userId: "56f42fdc-2061-4b84-9b58-c26f4c70641e"
}, {
    _id: "7bba8a63-0261-41ea-8081-372768120638",
    password: "$2a$10$Zmt7E2uc4hJY3o0R0j3JWufbWEe27Ztj5fWaoF5akyKwFXYTaqrdG",
    userId: "1128c4f2-cf1f-48e2-a3bb-82b68df1b838"
}, {
    _id: "0d99cffb-9d14-416a-9017-9442c5aff131",
    password: "$2a$10$PHbYxkbHO6uDvrxrLiD3PeaU4NFUpiT1ZpHEiOIaqBPbjVmeJyygO",
    userId: "d42500ef-5c5b-4837-a6fe-f192b1063888"
}, {
    _id: "9a02e4bf-d346-475d-868b-3276b5a91b49",
    password: "$2a$10$v8/S/dj2sJQJHss9H6pJ.u6wWD2QbgmrEPa85JZxUKMthuorTzeTy",
    userId: "043ffbc0-84af-4872-b09d-a35a328ae349"
} ]);
session.commitTransaction(); session.endSession();
