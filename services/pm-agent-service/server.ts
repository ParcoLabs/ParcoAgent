import Fastify from 'fastify';
import { propertyRequestSchema, approveRequestSchema, feedbackSchema, suggestionResponseSchema } from '../../shared/schema.js';
import { logger } from '../../shared/logger.js';

const fastify = Fastify({ logger: true });

// Mock vendor database
const vendors = [
  {
    id: 'vendor-1',
    name: 'ProFix Plumbing Services',
    trade: 'Plumbing',
    contact: '(555) 123-4567 • contact@profixplumbing.com',
    rating: 4.8,
  },
  {
    id: 'vendor-2',
    name: 'CoolAir HVAC',
    trade: 'HVAC',
    contact: '(555) 234-5678 • info@coolairhvac.com',
    rating: 4.9,
  },
  {
    id: 'vendor-3',
    name: 'ElectricPro',
    trade: 'Electrical',
    contact: '(555) 345-6789 • service@electricpro.com',
    rating: 4.7,
  },
  {
    id: 'vendor-4',
    name: 'SecureLocks Inc',
    trade: 'Locks',
    contact: '(555) 456-7890 • help@securelocks.com',
    rating: 4.6,
  },
  {
    id: 'vendor-5',
    name: 'General Maintenance Co',
    trade: 'General',
    contact: '(555) 567-8901 • contact@generalmc.com',
    rating: 4.5,
  },
];

// Intelligent classification function
function classifyRequest(description: string): {
  category: 'plumbing' | 'electrical' | 'hvac' | 'locks' | 'general';
  priority: 'urgent' | 'high' | 'normal' | 'low';
} {
  const desc = description.toLowerCase();
  
  // Category classification
  let category: 'plumbing' | 'electrical' | 'hvac' | 'locks' | 'general' = 'general';
  
  if (desc.includes('leak') || desc.includes('water') || desc.includes('pipe') || 
      desc.includes('sink') || desc.includes('toilet') || desc.includes('faucet') ||
      desc.includes('drain') || desc.includes('plumbing')) {
    category = 'plumbing';
  } else if (desc.includes('electric') || desc.includes('outlet') || desc.includes('wire') ||
             desc.includes('breaker') || desc.includes('light') || desc.includes('power')) {
    category = 'electrical';
  } else if (desc.includes('hvac') || desc.includes('heat') || desc.includes('cool') ||
             desc.includes('ac') || desc.includes('air') || desc.includes('temperature') ||
             desc.includes('thermostat')) {
    category = 'hvac';
  } else if (desc.includes('lock') || desc.includes('key') || desc.includes('door') ||
             desc.includes('access') || desc.includes('security')) {
    category = 'locks';
  }
  
  // Priority classification
  let priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
  
  if (desc.includes('emergency') || desc.includes('urgent') || desc.includes('flood') ||
      desc.includes('gas leak') || desc.includes('no heat') || desc.includes('no power') ||
      desc.includes('locked out')) {
    priority = 'urgent';
  } else if (desc.includes('leak') || desc.includes('not working') || desc.includes('broken') ||
             desc.includes('high') || desc.includes('important')) {
    priority = 'high';
  } else if (desc.includes('minor') || desc.includes('low') || desc.includes('cosmetic') ||
             desc.includes('when convenient')) {
    priority = 'low';
  }
  
  return { category, priority };
}

// Calculate SLA due date
function calculateSLADue(priority: string, emergency: boolean): string {
  const now = new Date();
  let hours = 72; // Default 3 days
  
  if (emergency || priority === 'urgent') {
    hours = 4;
  } else if (priority === 'high') {
    hours = 24;
  } else if (priority === 'normal') {
    hours = 48;
  }
  
  const dueDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return dueDate.toISOString();
}

// Generate draft messages
function generateDraftMessages(
  category: string,
  priority: string,
  vendor: any,
  propertyAddress: string,
  unitNumber?: string
): { vendor_message: string; tenant_update: string } {
  const unitStr = unitNumber ? `, Unit ${unitNumber}` : '';
  const priorityText = priority === 'urgent' ? 'URGENT - ' : '';
  
  const vendor_message = `Hi ${vendor.name}, we have a ${category} issue at ${propertyAddress}${unitStr}. ${priorityText}${priority} priority repair needed. Please confirm availability and provide quote. Property manager contact available.`;
  
  const tenant_update = `Hi! We've received your maintenance request for the ${category} issue. A licensed ${vendor.trade.toLowerCase()} will be scheduled within the SLA timeframe. We'll notify you once the appointment is confirmed. Thanks for reporting this promptly!`;
  
  return { vendor_message, tenant_update };
}

// PM Agent endpoints
fastify.post('/suggest', {
  schema: {
    body: propertyRequestSchema,
  },
}, async (request, reply) => {
  try {
    const { description, propertyAddress, unitNumber, emergency } = request.body;
    
    logger.info('Processing suggestion request', { description, propertyAddress });
    
    // Classify the request
    const { category, priority } = classifyRequest(description);
    
    // Find appropriate vendor
    const vendor = vendors.find(v => v.trade.toLowerCase() === category) || vendors[vendors.length - 1];
    
    // Calculate SLA
    const sla_due = calculateSLADue(priority, emergency);
    
    // Generate draft messages
    const drafts = generateDraftMessages(category, priority, vendor, propertyAddress, unitNumber);
    
    // Create summary
    const summary = `${category.charAt(0).toUpperCase() + category.slice(1)} issue identified at ${propertyAddress}${unitNumber ? `, Unit ${unitNumber}` : ''}. Priority: ${priority}. Recommended for ${vendor.trade.toLowerCase()} repair.`;
    
    const response = {
      summary,
      category,
      priority,
      sla_due,
      vendor_recommendation: {
        id: vendor.id,
        name: vendor.name,
        trade: vendor.trade,
        contact: vendor.contact,
        rating: vendor.rating,
      },
      drafts,
    };
    
    // Validate response
    const validatedResponse = suggestionResponseSchema.parse(response);
    
    reply.send(validatedResponse);
  } catch (error) {
    logger.error('Error processing suggestion', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/approve', {
  schema: {
    body: approveRequestSchema,
  },
}, async (request, reply) => {
  try {
    const { requestId, vendorId, notes } = request.body;
    
    logger.info('Processing approval request', { requestId, vendorId });
    
    // In a real implementation, this would update the database
    // and potentially send notifications to the vendor
    
    reply.send({
      success: true,
      message: 'Request approved and vendor notified',
      requestId,
      vendorId,
      approvedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error processing approval', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/feedback', {
  schema: {
    body: feedbackSchema,
  },
}, async (request, reply) => {
  try {
    const { requestId, rating, comments, completed } = request.body;
    
    logger.info('Processing feedback', { requestId, rating, completed });
    
    // In a real implementation, this would store feedback
    // and update vendor ratings
    
    reply.send({
      success: true,
      message: 'Feedback recorded',
      requestId,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error processing feedback', { error: error.message });
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'healthy', service: 'pm-agent' });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT_PM_AGENT || '4001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`PM Agent Service listening on port ${port}`);
  } catch (err) {
    logger.error('Error starting PM Agent Service', { error: err });
    process.exit(1);
  }
};

start();
