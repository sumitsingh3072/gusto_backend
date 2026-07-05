import { z } from "zod";
import { MenuItemSchema } from "../dto/MenuItem";

export const MenuProposedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  proposedItems: z.array(MenuItemSchema),
});

export type MenuProposedEvent = z.infer<typeof MenuProposedEventSchema>;

