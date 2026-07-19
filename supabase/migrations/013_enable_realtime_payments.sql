-- Habilita Postgres Changes (Realtime) solo para la tabla payments.
-- Se usa para que el cliente vea al instante cuando el admin aprueba/rechaza
-- su pago pendiente, sin necesidad de refrescar. La entrega respeta RLS
-- (policy payments_client_select ya restringe a las filas del propio cliente).
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
