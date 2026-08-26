import {
  api,
  getAccessToken,
} from "@/lib/api";

import type {
  InquiryCreatePayload,
  SavedListing,
} from "@/types/listing";

import type {
  Inquiry,
  InquiryInboxItem,
  InquiryMessage,
  InquiryStatus,
  InquiryThread,
} from "@/types/engagement";


interface InboxOptions {
  limit?: number;
  before?: string | null;
}


interface ThreadOptions {
  limit?: number;
  before?: string | null;
}


/*
 * Single-flight request dedupe.
 *
 * This prevents React development mode from accidentally
 * issuing the same GET twice at the same moment.
 *
 * We intentionally do NOT keep long-lived cached message data.
 */
const inFlightInbox =
  new Map<
    string,
    Promise<InquiryInboxItem[]>
  >();

const inFlightThreads =
  new Map<
    string,
    Promise<InquiryThread>
  >();

const inFlightReads =
  new Map<
    string,
    Promise<void>
  >();


function sessionKey(): string {
  return (
    getAccessToken() ??
    "cookie-session"
  );
}


function requestKey(
  parts: Array<
    string | number | null | undefined
  >,
): string {
  return [
    sessionKey(),
    ...parts.map(
      (part) =>
        part === null ||
        part === undefined
          ? ""
          : String(part),
    ),
  ].join(":");
}


export const engagementService = {
  /* =======================================================
     SAVED LISTINGS
  ======================================================= */

  async listSaved():
    Promise<SavedListing[]> {
    const response =
      await api.get<
        SavedListing[]
      >(
        "/saved-listings",
      );

    return response.data;
  },


  async saveListing(
    listingId: string,
  ): Promise<SavedListing> {
    const response =
      await api.post<
        SavedListing
      >(
        `/saved-listings/${listingId}`,
      );

    return response.data;
  },


  async removeSavedListing(
    listingId: string,
  ): Promise<void> {
    await api.delete(
      `/saved-listings/${listingId}`,
    );
  },


  /* =======================================================
     CREATE CONVERSATION
  ======================================================= */

 async createInquiry(
  listingId: string,
  payload: InquiryCreatePayload,
): Promise<void> {
  await api.post(
    `/listings/${listingId}/inquiries`,
    payload,
  );
},


  /* =======================================================
     MESSAGES INBOX
  ======================================================= */

  async listInbox(
    options: InboxOptions = {},
  ): Promise<InquiryInboxItem[]> {
    const {
      limit = 50,
      before = null,
    } = options;

    const key =
      requestKey([
        "inbox",
        limit,
        before,
      ]);


    const existing =
      inFlightInbox.get(
        key,
      );

    if (existing) {
      return existing;
    }


    const promise =
      api
        .get<
          InquiryInboxItem[]
        >(
          "/inquiries",
          {
            params: {
              limit,
              ...(before
                ? {
                    before,
                  }
                : {}),
            },
          },
        )
        .then(
          (response) =>
            response.data,
        )
        .finally(() => {
          inFlightInbox.delete(
            key,
          );
        });


    inFlightInbox.set(
      key,
      promise,
    );

    return promise;
  },


  /* =======================================================
     OPEN THREAD
  ======================================================= */

  async getInquiryThread(
    inquiryId: string,
    options: ThreadOptions = {},
  ): Promise<InquiryThread> {
    const {
      limit = 50,
      before = null,
    } = options;

    const key =
      requestKey([
        "thread",
        inquiryId,
        limit,
        before,
      ]);


    const existing =
      inFlightThreads.get(
        key,
      );

    if (existing) {
      return existing;
    }


    const promise =
      api
        .get<InquiryThread>(
          `/inquiries/${inquiryId}`,
          {
            params: {
              limit,
              ...(before
                ? {
                    before,
                  }
                : {}),
            },
          },
        )
        .then(
          (response) =>
            response.data,
        )
        .finally(() => {
          inFlightThreads.delete(
            key,
          );
        });


    inFlightThreads.set(
      key,
      promise,
    );

    return promise;
  },


  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async sendInquiryMessage(
    inquiryId: string,
    message: string,
  ): Promise<InquiryMessage> {
    const response =
      await api.post<
        InquiryMessage
      >(
        `/inquiries/${inquiryId}/messages`,
        {
          message,
        },
      );

    return response.data;
  },


  /* =======================================================
     MARK THREAD READ
  ======================================================= */

  async markInquiryRead(
    inquiryId: string,
  ): Promise<void> {
    const key =
      requestKey([
        "read",
        inquiryId,
      ]);


    const existing =
      inFlightReads.get(
        key,
      );

    if (existing) {
      return existing;
    }


    const promise =
      api
        .patch(
          `/inquiries/${inquiryId}/read`,
        )
        .then(
          () => undefined,
        )
        .finally(() => {
          inFlightReads.delete(
            key,
          );
        });


    inFlightReads.set(
      key,
      promise,
    );

    return promise;
  },


  /* =======================================================
     STATUS
  ======================================================= */

  async updateInquiryStatus(
    inquiryId: string,
    status: InquiryStatus,
  ): Promise<Inquiry> {
    const response =
      await api.patch<
        Inquiry
      >(
        `/inquiries/${inquiryId}`,
        {
          status,
        },
      );

    return response.data;
  },


  /* =======================================================
     OLD ENDPOINTS
     Keep these temporarily for anything elsewhere that
     still relies on them.
  ======================================================= */

  async listSentInquiries():
    Promise<Inquiry[]> {
    const response =
      await api.get<
        Inquiry[]
      >(
        "/inquiries/sent",
      );

    return response.data;
  },


  async listReceivedInquiries():
    Promise<Inquiry[]> {
    const response =
      await api.get<
        Inquiry[]
      >(
        "/inquiries/received",
      );

    return response.data;
  },
};