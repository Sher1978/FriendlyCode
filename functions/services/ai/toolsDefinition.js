/**
 * @file toolsDefinition.js
 * Gemini Function Calling tool definitions for Revoo AI Concierge.
 */

const toolsDefinition = [
  {
    functionDeclarations: [
      {
        name: "getAvailableSlots",
        description: "Получить свободные окна для записи на конкретную дату с учетом динамических скидок заведения.",
        parameters: {
          type: "OBJECT",
          properties: {
            dateStr: {
              type: "STRING",
              description: "Дата записи в формате YYYY-MM-DD (например: 2026-10-23)"
            },
            serviceName: {
              type: "STRING",
              description: "Название услуги (например: Мужская стрижка, Массаж спины)"
            },
            staffName: {
              type: "STRING",
              description: "Имя конкретного мастера или специалиста (необязательно, если клиент хочет любого)"
            }
          },
          required: ["dateStr"]
        }
      },
      {
        name: "createBooking",
        description: "Забронировать выбранное время для клиента со скидкой и подтвердить бронь в системе заведения.",
        parameters: {
          type: "OBJECT",
          properties: {
            clientName: {
              type: "STRING",
              description: "Имя клиента"
            },
            clientPhone: {
              type: "STRING",
              description: "Номер телефона клиента в международном формате (например: +79991234567)"
            },
            serviceName: {
              type: "STRING",
              description: "Название выбранной услуги"
            },
            dateStr: {
              type: "STRING",
              description: "Дата записи в формате YYYY-MM-DD"
            },
            timeStr: {
              type: "STRING",
              description: "Время записи в формате HH:mm (например: 14:00)"
            },
            staffName: {
              type: "STRING",
              description: "Имя мастера (или 'Любой свободный мастер')"
            },
            notes: {
              type: "STRING",
              description: "Особые пожелания клиента (необязательно)"
            }
          },
          required: ["clientName", "clientPhone", "serviceName", "dateStr", "timeStr"]
        }
      },
      {
        name: "getVenueFAQ",
        description: "Получить справочную информацию о заведении: парковка, правила для животных, косметика/бренды, часы работы, адрес.",
        parameters: {
          type: "OBJECT",
          properties: {
            topic: {
              type: "STRING",
              description: "Тема вопроса: 'parking' (парковка), 'pets' (животные), 'cancellation' (отмена/опоздания), 'brands' (косметика/материалы), 'general' (общее)"
            }
          },
          required: ["topic"]
        }
      },
      {
        name: "askHumanManager",
        description: "Передать нестандартный вопрос гостя живому дежурному диспетчеру заведения в Telegram, если в базе знаний заведения нет точного ответа. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать ответ или искать догадки в интернете.",
        parameters: {
          type: "OBJECT",
          properties: {
            question: {
              type: "STRING",
              description: "Точный текст вопроса гостя"
            },
            clientName: {
              type: "STRING",
              description: "Имя гостя (если известно)"
            },
            clientPhone: {
              type: "STRING",
              description: "Телефон гостя (если известен)"
            }
          },
          required: ["question"]
        }
      }
    ]
  }
];

module.exports = { toolsDefinition };
