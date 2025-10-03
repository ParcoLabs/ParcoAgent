import Fastify from 'fastify';
import { propertyRequestSchema, approveRequestSchema, feedbackSchema } from '../../shared/schema.js';
import { verifyHmacSignature, extractSignatureFromHeader } from '../../shared/hmac.js';
import { logger } from '../../shared/logger.js';

const fastify = Fastify({ logger: true });

const HMAC_SECRET = process.env.HMAC_SECRET || 'default-secret-key';
const PM_AGENT_BASE_URL = process.env.PM_AGENT_BASE_URL || 'http://localhost:4001';

// HMAC verification hook
fastify.addHook('preValidation', async (request, reply) => {
  if (request.url.startsWith('/agent/pm/')) {
    const signature = request.headers['x-parco-signature'] as string;
    
    if (!signature) {
      reply.code(401).send({ error: 'Missing x-parco-signature header' });
      return;
    }

    try {
      const body = JSON.stringify(request.body);
      const extractedSignature = extractSignatureFromHeader(signature);
      
      if (!verifyHmacSignature(body, extractedSignature, HMAC_SECRET)) {
        reply.code(401).send({ error: 'Invalid signature' });
        return;
      }
      
      logger.info('HMAC signature verified successfully');
    } catch (error) {
      logger.error('HMAC verification failed', { error: error.message });
      reply.code(401).send({ error: 'Invalid signature format' });
      return;
    }
  }
});

// Proxy helper function
async function proxyToPMAgent(endpoint: string, body: any) {
  const response = await fetch(`${PM_AGENT_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PM Agent service error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// API Gateway routes
fastify.post('/agent/pm/suggest', {
  schema: {
    body: propertyRequestSchema,
  },
}, async (request, reply) => {
  try {
    logger.info('Processing suggest request', { body: request.body });
    
    const result = await proxyToPMAgent('/suggest', request.body);
    
    reply.send(result);
  } catch (error) {
    logger.error('Error processing suggest request', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/agent/pm/approve', {
  schema: {
    body: approveRequestSchema,
  },
}, async (request, reply) => {
  try {
    logger.info('Processing approve request', { body: request.body });
    
    const result = await proxyToPMAgent('/approve', request.body);
    
    reply.send(result);
  } catch (error) {
    logger.error('Error processing approve request', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/agent/pm/feedback', {
  schema: {
    body: feedbackSchema,
  },
}, async (request, reply) => {
  try {
    logger.info('Processing feedback request', { body: request.body });
    
    const result = await proxyToPMAgent('/feedback', request.body);
    
    reply.send(result);
  } catch (error) {
    logger.error('Error processing feedback request', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'healthy', service: 'api-gateway' });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT_API_GATEWAY || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`API Gateway listening on port ${port}`);
  } catch (err) {
    logger.error('Error starting API Gateway', { error: err });
    process.exit(1);
  }
};

start();
