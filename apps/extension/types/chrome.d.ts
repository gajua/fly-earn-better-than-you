declare namespace chrome {
  namespace runtime {
    const id: string;
    const lastError: { message?: string } | undefined;

    function getURL(path: string): string;
    function sendMessage(message: unknown): Promise<unknown>;

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: { url?: string },
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    };

    const onStartup: {
      addListener(callback: () => void): void;
    };

    const onInstalled: {
      addListener(callback: () => void): void;
    };
  }

  namespace storage {
    interface StorageArea {
      get(keys?: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    }

    const local: StorageArea;
    const session: StorageArea & {
      setAccessLevel(options: {
        accessLevel: "TRUSTED_CONTEXTS" | "TRUSTED_AND_UNTRUSTED_CONTEXTS";
      }): Promise<void>;
    };

    const onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }

    function query(queryInfo: Record<string, unknown>): Promise<Tab[]>;

    const onUpdated: {
      addListener(callback: () => void): void;
    };
    const onRemoved: {
      addListener(callback: () => void): void;
    };
  }

  namespace action {
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  }

  namespace permissions {
    function request(permissions: {
      origins?: string[];
      permissions?: string[];
    }): Promise<boolean>;
  }
}
