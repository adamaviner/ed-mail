/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    drain: {
      begin: FunctionReference<
        "mutation",
        "internal",
        { id: string; leaseId: string; now: number; senderKey: string },
        "go" | "skip" | "lost",
        Name
      >;
      cancel: FunctionReference<
        "mutation",
        "internal",
        { id: string; now: number },
        null,
        Name
      >;
      claim: FunctionReference<
        "mutation",
        "internal",
        {
          batch: number;
          leaseId: string;
          now: number;
          senderKey: string;
          senderTitle: string;
        },
        | { state: "notMine" }
        | {
            settled: Array<{
              error?: string;
              id: string;
              onSettled: { context?: any; handle: string };
            }>;
            state: "notConnected";
          }
        | {
            messages: Array<{
              guard: { context?: any; handle: string } | null;
              html: string;
              message: {
                attachments: Array<string>;
                attempts: number;
                by: string | null;
                cc: Array<string>;
                createdAt: number;
                error: string | null;
                files: Array<{
                  contentType: string;
                  filename: string;
                  size: number;
                }>;
                id: string;
                kind: string;
                nextAttemptAt: number | null;
                ref: { id: string; type: string } | null;
                replyTo: string | null;
                resendOf: string | null;
                scope: string | null;
                senderKey: string;
                sentAt: number | null;
                settledAt: number | null;
                status: "queued" | "sending" | "sent" | "failed" | "cancelled";
                subject: string;
                to: Array<string>;
                warning: string | null;
              };
              text: string;
            }>;
            state: "claimed";
          },
        Name
      >;
      failSender: FunctionReference<
        "mutation",
        "internal",
        { error: string; now: number; senderKey: string },
        Array<{
          error?: string;
          id: string;
          onSettled: { context?: any; handle: string };
        }>,
        Name
      >;
      release: FunctionReference<
        "mutation",
        "internal",
        { leaseId: string; now: number; senderKey: string },
        number | null,
        Name
      >;
      settle: FunctionReference<
        "mutation",
        "internal",
        { error?: string; id: string; now: number; warning?: string },
        null | {
          error?: string;
          id: string;
          onSettled: { context?: any; handle: string };
        },
        Name
      >;
    };
    maintenance: {
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { batch?: number; now: number },
        { deleted: number; more: boolean },
        Name
      >;
      markReported: FunctionReference<
        "mutation",
        "internal",
        { ids: Array<string>; now: number },
        null,
        Name
      >;
      unreported: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          attachments: Array<string>;
          attempts: number;
          by: string | null;
          cc: Array<string>;
          createdAt: number;
          error: string | null;
          files: Array<{ contentType: string; filename: string; size: number }>;
          id: string;
          kind: string;
          nextAttemptAt: number | null;
          ref: { id: string; type: string } | null;
          replyTo: string | null;
          resendOf: string | null;
          scope: string | null;
          senderKey: string;
          sentAt: number | null;
          settledAt: number | null;
          status: "queued" | "sending" | "sent" | "failed" | "cancelled";
          subject: string;
          to: Array<string>;
          warning: string | null;
        }>,
        Name
      >;
    };
    messages: {
      cancelChain: FunctionReference<
        "mutation",
        "internal",
        { chain: string; now: number },
        number,
        Name
      >;
      enqueue: FunctionReference<
        "mutation",
        "internal",
        {
          attachments?: Array<string>;
          by?: string;
          cc?: Array<string>;
          chain?: string;
          guard?: { context?: any; handle: string };
          html: string;
          kind: string;
          now: number;
          onSettled?: { context?: any; handle: string };
          ref?: { id: string; type: string };
          replyTo?: string;
          scope?: string;
          senderKey: string;
          senderTitle: string;
          subject: string;
          text: string;
          to: Array<string>;
        },
        {
          drain: { at: number; leaseId: string } | null;
          id: string;
          settled: null | {
            error: string;
            onSettled: { context?: any; handle: string } | null;
          };
        },
        Name
      >;
      failedSince: FunctionReference<
        "query",
        "internal",
        { cap?: number; since: number },
        number,
        Name
      >;
      finish: FunctionReference<
        "mutation",
        "internal",
        { error?: string; id: string; now: number; warning?: string },
        null,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          attachments: Array<string>;
          attempts: number;
          by: string | null;
          cc: Array<string>;
          createdAt: number;
          error: string | null;
          files: Array<{ contentType: string; filename: string; size: number }>;
          id: string;
          kind: string;
          nextAttemptAt: number | null;
          ref: { id: string; type: string } | null;
          replyTo: string | null;
          resendOf: string | null;
          scope: string | null;
          senderKey: string;
          sentAt: number | null;
          settledAt: number | null;
          status: "queued" | "sending" | "sent" | "failed" | "cancelled";
          subject: string;
          to: Array<string>;
          warning: string | null;
        } | null,
        Name
      >;
      getWithBody: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | {
          html: string;
          message: {
            attachments: Array<string>;
            attempts: number;
            by: string | null;
            cc: Array<string>;
            createdAt: number;
            error: string | null;
            files: Array<{
              contentType: string;
              filename: string;
              size: number;
            }>;
            id: string;
            kind: string;
            nextAttemptAt: number | null;
            ref: { id: string; type: string } | null;
            replyTo: string | null;
            resendOf: string | null;
            scope: string | null;
            senderKey: string;
            sentAt: number | null;
            settledAt: number | null;
            status: "queued" | "sending" | "sent" | "failed" | "cancelled";
            subject: string;
            to: Array<string>;
            warning: string | null;
          };
          text: string;
        },
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          kind?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          scope?: string;
          senderKey?: string;
          status?: "queued" | "sending" | "sent" | "failed" | "cancelled";
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            attachments: Array<string>;
            attempts: number;
            by: string | null;
            cc: Array<string>;
            createdAt: number;
            error: string | null;
            files: Array<{
              contentType: string;
              filename: string;
              size: number;
            }>;
            id: string;
            kind: string;
            nextAttemptAt: number | null;
            ref: { id: string; type: string } | null;
            replyTo: string | null;
            resendOf: string | null;
            scope: string | null;
            senderKey: string;
            sentAt: number | null;
            settledAt: number | null;
            status: "queued" | "sending" | "sent" | "failed" | "cancelled";
            subject: string;
            to: Array<string>;
            warning: string | null;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      resend: FunctionReference<
        "mutation",
        "internal",
        { by?: string; id: string; now: number; senderTitle: string },
        {
          drain: { at: number; leaseId: string } | null;
          id: string;
          settled: null | {
            error: string;
            onSettled: { context?: any; handle: string } | null;
          };
        },
        Name
      >;
      retryFailed: FunctionReference<
        "mutation",
        "internal",
        { now: number; senderKey: string; since: number },
        { count: number; drain: { at: number; leaseId: string } | null },
        Name
      >;
      search: FunctionReference<
        "query",
        "internal",
        {
          kind?: string;
          limit?: number;
          senderKey?: string;
          status?: "queued" | "sending" | "sent" | "failed" | "cancelled";
          text: string;
        },
        Array<{
          attachments: Array<string>;
          attempts: number;
          by: string | null;
          cc: Array<string>;
          createdAt: number;
          error: string | null;
          files: Array<{ contentType: string; filename: string; size: number }>;
          id: string;
          kind: string;
          nextAttemptAt: number | null;
          ref: { id: string; type: string } | null;
          replyTo: string | null;
          resendOf: string | null;
          scope: string | null;
          senderKey: string;
          sentAt: number | null;
          settledAt: number | null;
          status: "queued" | "sending" | "sent" | "failed" | "cancelled";
          subject: string;
          to: Array<string>;
          warning: string | null;
        }>,
        Name
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          attachments?: Array<string>;
          by?: string;
          cc?: Array<string>;
          chain?: string;
          files?: Array<{
            contentType: string;
            filename: string;
            size: number;
          }>;
          guard?: { context?: any; handle: string };
          html: string;
          kind: string;
          now: number;
          onSettled?: { context?: any; handle: string };
          ref?: { id: string; type: string };
          replyTo?: string;
          scope?: string;
          senderKey: string;
          senderTitle: string;
          subject: string;
          text: string;
          to: Array<string>;
        },
        { error: string | null; id: string },
        Name
      >;
      statusFor: FunctionReference<
        "query",
        "internal",
        { kind?: string; ref: { id: string; type: string } },
        {
          attachments: Array<string>;
          attempts: number;
          by: string | null;
          cc: Array<string>;
          createdAt: number;
          error: string | null;
          files: Array<{ contentType: string; filename: string; size: number }>;
          id: string;
          kind: string;
          nextAttemptAt: number | null;
          ref: { id: string; type: string } | null;
          replyTo: string | null;
          resendOf: string | null;
          scope: string | null;
          senderKey: string;
          sentAt: number | null;
          settledAt: number | null;
          status: "queued" | "sending" | "sent" | "failed" | "cancelled";
          subject: string;
          to: Array<string>;
          warning: string | null;
        } | null,
        Name
      >;
    };
    senders: {
      address: FunctionReference<
        "query",
        "internal",
        { key: string },
        string | null,
        Name
      >;
      cacheToken: FunctionReference<
        "mutation",
        "internal",
        { accessTokenEnc: string; expiresAt: number; key: string },
        null,
        Name
      >;
      credentials: FunctionReference<
        "query",
        "internal",
        { key: string },
        null | {
          accessTokenEnc?: string;
          accessTokenExpiresAt?: number;
          account: string;
          fromEmail?: string;
          fromName?: string;
          key: string;
          lastError?: string;
          refreshTokenEnc: string;
          replyTo?: string;
        },
        Name
      >;
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { key: string },
        null | { account: string; refreshTokenEnc: string | null },
        Name
      >;
      finishConnect: FunctionReference<
        "mutation",
        "internal",
        {
          account: string;
          now: number;
          refreshTokenEnc: string;
          stateHash: string;
        },
        null | { senderKey: string },
        Name
      >;
      importSender: FunctionReference<
        "mutation",
        "internal",
        {
          account: string;
          connectedAt: number;
          connectedBy?: string;
          fromEmail?: string;
          fromName?: string;
          key: string;
          refreshTokenEnc: string;
          replyTo?: string;
        },
        null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          account: string;
          connectedAt: number;
          connectedBy: string | null;
          fromEmail: string | null;
          fromName: string | null;
          key: string;
          lastError: string | null;
          lastErrorAt: number | null;
          replyTo: string | null;
        }>,
        Name
      >;
      peekState: FunctionReference<
        "query",
        "internal",
        { now: number; stateHash: string },
        null | { senderKey: string },
        Name
      >;
      recordError: FunctionReference<
        "mutation",
        "internal",
        { error?: string; key: string; now: number },
        null,
        Name
      >;
      startConnect: FunctionReference<
        "mutation",
        "internal",
        { by?: string; expiresAt: number; key: string; stateHash: string },
        string | null,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        { fromEmail: string; fromName: string; key: string; replyTo: string },
        null,
        Name
      >;
    };
    settings: {
      get: FunctionReference<
        "query",
        "internal",
        {},
        {
          digestTo: string;
          retentionDays: number;
          retryMinutes: Array<number>;
        },
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          digestTo?: string;
          retentionDays?: number;
          retryMinutes?: Array<number>;
        },
        null,
        Name
      >;
    };
    texts: {
      get: FunctionReference<
        "query",
        "internal",
        { key: string },
        {
          body: string;
          key: string;
          subject: string;
          updatedAt: number;
          updatedBy: string | null;
        } | null,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          body: string;
          key: string;
          subject: string;
          updatedAt: number;
          updatedBy: string | null;
        }>,
        Name
      >;
      reset: FunctionReference<
        "mutation",
        "internal",
        { key: string },
        null,
        Name
      >;
      save: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          by?: string;
          key: string;
          now: number;
          subject: string;
        },
        null,
        Name
      >;
    };
  };
