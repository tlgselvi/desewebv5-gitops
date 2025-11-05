import { redis } from "@/services/storage/redisClient.js";
import { logger } from "@/utils/logger.js";
import { TelemetryAgent } from "@/services/aiops/telemetryAgent.js";
import { config } from "@/config/index.js";

/**
 * FinBot Event Consumer
 * Consumes events from Redis Stream and processes business logic
 */

const STREAM_KEY = "finbot.events";
const DLQ_KEY = "finbot.events.dlq";
const CONSUMER_GROUP = "finbot-consumers";
const CONSUMER_NAME = `consumer-${process.pid}-${Date.now()}`;

// Backend API URLs
const BACKEND_BASE = process.env.BACKEND_URL || `http://localhost:${config.port}`;
const MUBOT_API_BASE = process.env.MUBOT_API_URL || `${BACKEND_BASE}/api/v1/mubot`;

// AIOps Telemetry Agent
const telemetryAgent = new TelemetryAgent();

// Consumer state
let isRunning = false;
let consumerInterval: NodeJS.Timeout | null = null;

/**
 * Initialize consumer group if it doesn't exist
 */
async function ensureConsumerGroup(): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, CONSUMER_GROUP, "0", "MKSTREAM");
    logger.info("FinBot consumer group created", { group: CONSUMER_GROUP });
  } catch (error: any) {
    // Group already exists or other error
    if (error.message && !error.message.includes("BUSYGROUP")) {
      logger.warn("Failed to create consumer group", {
        error: error.message,
        group: CONSUMER_GROUP,
      });
    }
  }
}

/**
 * Handle transaction created event
 */
async function handleTransactionCreated(eventData: Record<string, string>): Promise<void> {
  try {
    const transaction = JSON.parse(eventData.payload || "{}");

    logger.info("Processing transaction created event", {
      transactionId: transaction.id,
      amount: transaction.amount,
    });

    // 1. Update MuBot accounting records
    try {
      const mubotResponse = await fetch(`${MUBOT_API_BASE}/accounting/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency || "USD",
          category: transaction.category,
          timestamp: transaction.timestamp || Date.now(),
          source: "finbot",
        }),
      });

      if (mubotResponse.ok) {
        logger.info("MuBot accounting record updated", {
          transactionId: transaction.id,
        });
      } else {
        logger.warn("Failed to update MuBot accounting record", {
          transactionId: transaction.id,
          status: mubotResponse.status,
        });
      }
    } catch (error) {
      logger.error("Error updating MuBot accounting record", {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Trigger AIOps correlation analysis
    try {
      const telemetryData = await telemetryAgent.getSystemState();
      
      if (telemetryData.drift) {
        logger.warn("AIOps drift detected after transaction creation", {
          transactionId: transaction.id,
          drift: telemetryData.drift,
          avgLatency: telemetryData.avgLatency,
        });
      }

      logger.info("AIOps correlation analysis triggered", {
        transactionId: transaction.id,
        drift: telemetryData.drift,
      });
    } catch (error) {
      logger.error("Error triggering AIOps correlation analysis", {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Transaction created event processed successfully", {
      transactionId: transaction.id,
    });
  } catch (error) {
    logger.error("Error handling transaction created event", {
      error: error instanceof Error ? error.message : String(error),
      eventData,
    });
    throw error;
  }
}

/**
 * Handle transaction updated event
 */
async function handleTransactionUpdated(eventData: Record<string, string>): Promise<void> {
  try {
    const transaction = JSON.parse(eventData.payload || "{}");

    logger.info("Processing transaction updated event", {
      transactionId: transaction.id,
      amount: transaction.amount,
    });

    // 1. Update MuBot accounting records
    try {
      const mubotResponse = await fetch(`${MUBOT_API_BASE}/accounting/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency || "USD",
          category: transaction.category,
          timestamp: transaction.timestamp || Date.now(),
          source: "finbot",
        }),
      });

      if (mubotResponse.ok) {
        logger.info("MuBot accounting record updated", {
          transactionId: transaction.id,
        });
      } else {
        logger.warn("Failed to update MuBot accounting record", {
          transactionId: transaction.id,
          status: mubotResponse.status,
        });
      }
    } catch (error) {
      logger.error("Error updating MuBot accounting record", {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Trigger AIOps correlation analysis
    try {
      const telemetryData = await telemetryAgent.getSystemState();
      
      logger.info("AIOps correlation analysis triggered", {
        transactionId: transaction.id,
        drift: telemetryData.drift,
      });
    } catch (error) {
      logger.error("Error triggering AIOps correlation analysis", {
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Transaction updated event processed successfully", {
      transactionId: transaction.id,
    });
  } catch (error) {
    logger.error("Error handling transaction updated event", {
      error: error instanceof Error ? error.message : String(error),
      eventData,
    });
    throw error;
  }
}

/**
 * Handle account created event
 */
async function handleAccountCreated(eventData: Record<string, string>): Promise<void> {
  try {
    const account = JSON.parse(eventData.payload || "{}");

    logger.info("Processing account created event", {
      accountId: account.id,
      accountName: account.name,
    });

    // 1. Update MuBot accounting records
    try {
      const mubotResponse = await fetch(`${MUBOT_API_BASE}/accounting/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          balance: account.balance || 0,
          currency: account.currency || "USD",
          timestamp: account.timestamp || Date.now(),
          source: "finbot",
        }),
      });

      if (mubotResponse.ok) {
        logger.info("MuBot accounting record created", {
          accountId: account.id,
        });
      } else {
        logger.warn("Failed to create MuBot accounting record", {
          accountId: account.id,
          status: mubotResponse.status,
        });
      }
    } catch (error) {
      logger.error("Error creating MuBot accounting record", {
        accountId: account.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Trigger AIOps correlation analysis
    try {
      const telemetryData = await telemetryAgent.getSystemState();
      
      logger.info("AIOps correlation analysis triggered", {
        accountId: account.id,
        drift: telemetryData.drift,
      });
    } catch (error) {
      logger.error("Error triggering AIOps correlation analysis", {
        accountId: account.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Account created event processed successfully", {
      accountId: account.id,
    });
  } catch (error) {
    logger.error("Error handling account created event", {
      error: error instanceof Error ? error.message : String(error),
      eventData,
    });
    throw error;
  }
}

/**
 * Handle budget updated event
 */
async function handleBudgetUpdated(eventData: Record<string, string>): Promise<void> {
  try {
    const budget = JSON.parse(eventData.payload || "{}");

    logger.info("Processing budget updated event", {
      budgetId: budget.id,
      amount: budget.amount,
    });

    // 1. Update MuBot accounting records
    try {
      const mubotResponse = await fetch(`${MUBOT_API_BASE}/accounting/budgets/${budget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budgetId: budget.id,
          amount: budget.amount,
          currency: budget.currency || "USD",
          period: budget.period,
          timestamp: budget.timestamp || Date.now(),
          source: "finbot",
        }),
      });

      if (mubotResponse.ok) {
        logger.info("MuBot budget record updated", {
          budgetId: budget.id,
        });
      } else {
        logger.warn("Failed to update MuBot budget record", {
          budgetId: budget.id,
          status: mubotResponse.status,
        });
      }
    } catch (error) {
      logger.error("Error updating MuBot budget record", {
        budgetId: budget.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Trigger AIOps correlation analysis
    try {
      const telemetryData = await telemetryAgent.getSystemState();
      
      logger.info("AIOps correlation analysis triggered", {
        budgetId: budget.id,
        drift: telemetryData.drift,
      });
    } catch (error) {
      logger.error("Error triggering AIOps correlation analysis", {
        budgetId: budget.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Budget updated event processed successfully", {
      budgetId: budget.id,
    });
  } catch (error) {
    logger.error("Error handling budget updated event", {
      error: error instanceof Error ? error.message : String(error),
      eventData,
    });
    throw error;
  }
}

/**
 * Send failed message to Dead Letter Queue (DLQ)
 */
async function sendToDLQ(
  messageId: string,
  eventData: Record<string, string>,
  error: Error,
): Promise<void> {
  try {
    await redis.xadd(
      DLQ_KEY,
      "*",
      "originalMessageId",
      messageId,
      "eventType",
      eventData.eventType || "unknown",
      "payload",
      eventData.payload || JSON.stringify(eventData),
      "error",
      error.message,
      "errorStack",
      error.stack || "",
      "timestamp",
      Date.now().toString(),
      "retryCount",
      (parseInt(eventData.retryCount || "0") + 1).toString(),
    );

    logger.error("Message sent to DLQ", {
      messageId,
      eventType: eventData.eventType,
      error: error.message,
      dlqKey: DLQ_KEY,
    });
  } catch (dlqError) {
    logger.error("Failed to send message to DLQ", {
      messageId,
      error: dlqError instanceof Error ? dlqError.message : String(dlqError),
    });
  }
}

/**
 * Process a single event from the stream
 */
async function processEvent(
  messageId: string,
  eventData: Record<string, string>,
): Promise<void> {
  const eventType = eventData.eventType || "unknown";
  const retryCount = parseInt(eventData.retryCount || "0");
  const maxRetries = 3;

  try {
    logger.debug("Processing FinBot event", {
      messageId,
      eventType,
      retryCount,
    });

    // Route to appropriate handler
    switch (eventType) {
      case "transaction.created":
        await handleTransactionCreated(eventData);
        break;
      case "transaction.updated":
        await handleTransactionUpdated(eventData);
        break;
      case "account.created":
        await handleAccountCreated(eventData);
        break;
      case "budget.updated":
        await handleBudgetUpdated(eventData);
        break;
      default:
        logger.warn("Unknown event type", { eventType, messageId });
    }

    // Acknowledge message
    await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    logger.debug("Event processed and acknowledged", { messageId, eventType });
  } catch (error) {
    logger.error("Error processing event", {
      messageId,
      eventType,
      retryCount,
      error: error instanceof Error ? error.message : String(error),
    });

    // If max retries exceeded, send to DLQ
    if (retryCount >= maxRetries) {
      await sendToDLQ(
        messageId,
        { ...eventData, retryCount: retryCount.toString() },
        error instanceof Error ? error : new Error(String(error)),
      );
      // Acknowledge to remove from stream
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    } else {
      // Increment retry count and requeue
      const retryData = {
        ...eventData,
        retryCount: (retryCount + 1).toString(),
      };
      await redis.xadd(
        STREAM_KEY,
        "*",
        ...Object.entries(retryData).flat(),
      );
      // Acknowledge original message
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
      
      logger.info("Event requeued for retry", {
        messageId,
        eventType,
        retryCount: retryCount + 1,
      });
    }
  }
}

/**
 * Process pending messages from the stream
 */
async function processPendingMessages(): Promise<void> {
  try {
    // Read pending messages for this consumer
    const pendingMessages = await redis.xpending(
      STREAM_KEY,
      CONSUMER_GROUP,
      "-",
      "+",
      10,
      CONSUMER_NAME,
    );

    if (pendingMessages.length === 0) {
      return;
    }

    logger.info("Processing pending messages", {
      count: pendingMessages.length,
      consumer: CONSUMER_NAME,
    });

    for (const msg of pendingMessages) {
      const messageId = msg[0];
      const idleTime = parseInt(msg[3] || "0");

      // If message has been idle for more than 5 minutes, claim it
      if (idleTime > 5 * 60 * 1000) {
        try {
          const claimed = await redis.xclaim(
            STREAM_KEY,
            CONSUMER_GROUP,
            CONSUMER_NAME,
            5 * 60 * 1000,
            messageId,
          );

          if (claimed && claimed.length > 0) {
            const eventData: Record<string, string> = {};
            const fields = claimed[0][1];
            
            for (let i = 0; i < fields.length; i += 2) {
              eventData[fields[i]] = fields[i + 1];
            }

            await processEvent(messageId, eventData);
          }
        } catch (error) {
          logger.error("Error claiming pending message", {
            messageId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error processing pending messages", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read and process new messages from the stream
 */
async function readAndProcessMessages(): Promise<void> {
  try {
    // Read new messages
    const messages = await redis.xreadgroup(
      "GROUP",
      CONSUMER_GROUP,
      CONSUMER_NAME,
      "COUNT",
      "10",
      "BLOCK",
      "1000",
      "STREAMS",
      STREAM_KEY,
      ">",
    );

    if (!messages || messages.length === 0) {
      return;
    }

    const streamMessages = messages[0][1];
    
    for (const msg of streamMessages) {
      const messageId = msg[0];
      const eventData: Record<string, string> = {};
      const fields = msg[1];
      
      for (let i = 0; i < fields.length; i += 2) {
        eventData[fields[i]] = fields[i + 1];
      }

      await processEvent(messageId, eventData);
    }
  } catch (error) {
    logger.error("Error reading messages from stream", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main consumer loop
 */
async function consumerLoop(): Promise<void> {
  if (!isRunning) {
    return;
  }

  try {
    // Process pending messages first
    await processPendingMessages();

    // Then read new messages
    await readAndProcessMessages();
  } catch (error) {
    logger.error("Error in consumer loop", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Start FinBot event consumer
 */
export async function startFinBotConsumer(): Promise<void> {
  if (isRunning) {
    logger.warn("FinBot consumer is already running");
    return;
  }

  try {
    logger.info("Starting FinBot event consumer", {
      stream: STREAM_KEY,
      consumerGroup: CONSUMER_GROUP,
      consumerName: CONSUMER_NAME,
    });

    // Ensure consumer group exists
    await ensureConsumerGroup();

    // Start consumer loop
    isRunning = true;
    consumerInterval = setInterval(consumerLoop, 1000); // Run every second

    // Run initial loop
    await consumerLoop();

    logger.info("FinBot event consumer started successfully", {
      stream: STREAM_KEY,
      consumerGroup: CONSUMER_GROUP,
      consumerName: CONSUMER_NAME,
    });
  } catch (error) {
    logger.error("Failed to start FinBot consumer", {
      error: error instanceof Error ? error.message : String(error),
    });
    isRunning = false;
    throw error;
  }
}

/**
 * Stop FinBot event consumer
 */
export async function stopFinBotConsumer(): Promise<void> {
  if (!isRunning) {
    logger.warn("FinBot consumer is not running");
    return;
  }

  try {
    logger.info("Stopping FinBot event consumer", {
      consumerName: CONSUMER_NAME,
    });

    isRunning = false;

    if (consumerInterval) {
      clearInterval(consumerInterval);
      consumerInterval = null;
    }

    logger.info("FinBot event consumer stopped successfully");
  } catch (error) {
    logger.error("Error stopping FinBot consumer", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get consumer status
 */
export function getConsumerStatus(): {
  isRunning: boolean;
  stream: string;
  consumerGroup: string;
  consumerName: string;
} {
  return {
    isRunning,
    stream: STREAM_KEY,
    consumerGroup: CONSUMER_GROUP,
    consumerName: CONSUMER_NAME,
  };
}

