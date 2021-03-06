"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const Stripe = require("stripe");
const stripe = new Stripe(functions.config().stripe.secret);
exports.createStripeCustomer = functions.auth
    .user()
    .onCreate((userRecord, context) => __awaiter(this, void 0, void 0, function* () {
    const firebaseUID = userRecord.uid;
    const customer = yield stripe.customers.create({
        metadata: { firebaseUID }
    });
    return db.doc(`users/${firebaseUID}`).update({
        stripeId: customer.id
    });
}));
exports.startSubscription = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    try {
        const userId = context.auth.uid;
        const userDoc = yield db.doc(`users/${userId}`).get();
        const user = userDoc.data();
        console.log(1, data);
        console.log(1, context);
        // Attach the card to the user
        const source = yield stripe.customers.createSource(user.stripeId, {
            source: data.source
        });
        console.log(2, source);
        if (!source) {
            throw new Error('Stripe failed to attach card');
        }
        // Subscribe the user to the plan
        const sub = yield stripe.subscriptions.create({
            customer: user.stripeId,
            items: [{ plan: 'plan_DELd0Jgt7IVwF7' }]
        });
        return db.doc(`users/${userId}`).update({
            status: sub.status,
            currentUsage: 0,
            subscriptionId: sub.id,
            itemId: sub.items.data[0].id
        });
    }
    catch (error) {
        throw new Error(error);
    }
}));
// exports.tellFortune = functions.https.onCall(async (data, context) => {
//   const userId = context.auth.uid;
//   const userDoc = await db.doc(`users/${userId}`).get();
//   const user = userDoc.data();
//   await (stripe as any).usageRecords.create(
//     user.itemId,
//     {
//       quantity: 1,
//       timestamp: Date.now(),
//       action: 'increment'
//     },
//     {
//       idempotency_key: data.idempotencyKey
//     }
//   );
//   return;
// });
exports.updateUsage = functions.firestore
    .document('projects/{projectId}')
    .onCreate((snap) => __awaiter(this, void 0, void 0, function* () {
    const userRef = db.doc(`users/${snap.data().userId}`);
    const userDoc = yield userRef.get();
    const user = userDoc.data();
    console.log(user);
    const usage = yield stripe.usageRecords.create(user.itemId, {
        quantity: 1,
        timestamp: (Date.parse(snap.createTime) / 1000) | 0,
        action: 'increment'
    }, {
        idempotency_key: snap.id
    });
    console.log(usage);
    return userRef.update({ currentUsage: user.currentUsage + 1 });
}));
//# sourceMappingURL=index.js.map