require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { connectDb } = require('../config/db');
const { generateNumber } = require('../utils/numbering');

const { User } = require('../models/User');
const { Job } = require('../models/Job');
const { WorkOrder } = require('../models/WorkOrder');
const { Invoice } = require('../models/Invoice');
const { Message } = require('../models/Message');
const { Notification } = require('../models/Notification');
const { ToolsLog } = require('../models/ToolsLog');

async function ensureUser({ role, name, email, password, phone, companyName, contractorProfile }) {
  const existing = await User.findOne({ email: email.toLowerCase(), role });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    role,
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone,
    companyName,
    contractorProfile,
  });
  return user;
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
}

async function seed({ drop }) {
  if (drop) {
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      WorkOrder.deleteMany({}),
      Invoice.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      ToolsLog.deleteMany({}),
    ]);
  }

  const agentEmail = 'saviours.x.agent@gmail.com';
  const contractorEmail = 'saviours.x.contractor@gmail.com';
  const agentPassword = 'SavioursX@123DemoA';
  const contractorPassword = 'SavioursX@123DemoC';

  if (!drop) {
    const oldUsers = await User.find({ email: /@demo\.rentrflow\.com$/i }).select('_id');
    const oldIds = oldUsers.map((u) => u._id);
    if (oldIds.length > 0) {
      const oldJobs = await Job.find({
        $or: [
          { createdBy: { $in: oldIds } },
          { assignedContractor: { $in: oldIds } },
          { applicants: { $elemMatch: { contractor: { $in: oldIds } } } },
        ],
      }).select('_id');
      const oldJobIds = oldJobs.map((j) => j._id);

      await Promise.all([
        Message.deleteMany({ $or: [{ fromUser: { $in: oldIds } }, { toUser: { $in: oldIds } }, { job: { $in: oldJobIds } }] }),
        Notification.deleteMany({ $or: [{ user: { $in: oldIds } }, { job: { $in: oldJobIds } }] }),
        Invoice.deleteMany({ $or: [{ agent: { $in: oldIds } }, { contractor: { $in: oldIds } }, { job: { $in: oldJobIds } }] }),
        WorkOrder.deleteMany({ $or: [{ agent: { $in: oldIds } }, { contractor: { $in: oldIds } }, { job: { $in: oldJobIds } }] }),
        ToolsLog.deleteMany({ user: { $in: oldIds } }),
        Job.deleteMany({ _id: { $in: oldJobIds } }),
        User.deleteMany({ _id: { $in: oldIds } }),
      ]);
    }
  }

  const already = await User.findOne({ email: agentEmail.toLowerCase(), role: 'agent' });
  if (already && !drop) {
    return {
      skipped: true,
      agentEmail,
      contractorEmail,
      agentPassword,
      contractorPassword,
    };
  }

  const agent = await ensureUser({
    role: 'agent',
    name: 'SavioursX_Agent',
    email: agentEmail,
    password: agentPassword,
    phone: '9999999999',
    companyName: 'SavioursX Agency',
  });

  const contractor = await ensureUser({
    role: 'contractor',
    name: 'SavioursX_Contractor',
    email: contractorEmail,
    password: contractorPassword,
    phone: '8888888888',
    companyName: 'SavioursX Builds',
    contractorProfile: {
      skills: ['Electrical', 'HVAC', 'Painting'],
      serviceAreas: ['Bengaluru', 'Hyderabad'],
    },
  });

  const openJob = await Job.create({
    createdBy: agent._id,
    title: 'Fix electrical wiring - 2BHK',
    description: 'Need rewiring for a 2BHK. Replace old switches and check MCB box.',
    location: 'Bengaluru',
    status: 'OPEN',
    budget: { currency: 'INR', amount: 18000 },
  });

  const assignedJob = await Job.create({
    createdBy: agent._id,
    title: 'Bathroom plumbing repair',
    description: 'Fix leakage under sink and replace damaged pipes. Verify water pressure.',
    location: 'Mumbai',
    status: 'ASSIGNED',
    budget: { currency: 'INR', amount: 9000 },
    assignedContractor: contractor._id,
    applicants: [{ contractor: contractor._id, note: 'Available this week', status: 'ACCEPTED' }],
  });

  const inProgressJob = await Job.create({
    createdBy: agent._id,
    title: 'AC servicing and filter replacement',
    description: 'Service 2 split AC units and replace filters; check gas levels.',
    location: 'Hyderabad',
    status: 'IN_PROGRESS',
    budget: { currency: 'INR', amount: 6500 },
    assignedContractor: contractor._id,
    applicants: [{ contractor: contractor._id, note: 'Can start tomorrow', status: 'ACCEPTED' }],
  });

  const completedJob = await Job.create({
    createdBy: agent._id,
    title: 'Interior painting - living room',
    description: 'Living room repaint with premium washable paint. Includes surface prep.',
    location: 'Bengaluru',
    status: 'COMPLETED',
    budget: { currency: 'INR', amount: 12000 },
    assignedContractor: contractor._id,
    applicants: [{ contractor: contractor._id, note: 'Completed similar jobs', status: 'ACCEPTED' }],
  });

  const woAssigned = await WorkOrder.create({
    job: assignedJob._id,
    agent: agent._id,
    contractor: contractor._id,
    workOrderNumber: generateNumber('WO'),
    scopeOfWork: assignedJob.description,
    terms: 'Standard terms apply',
    status: 'ISSUED',
  });

  const woInProgress = await WorkOrder.create({
    job: inProgressJob._id,
    agent: agent._id,
    contractor: contractor._id,
    workOrderNumber: generateNumber('WO'),
    scopeOfWork: inProgressJob.description,
    terms: 'Standard terms apply',
    status: 'SIGNED',
  });

  const woCompleted = await WorkOrder.create({
    job: completedJob._id,
    agent: agent._id,
    contractor: contractor._id,
    workOrderNumber: generateNumber('WO'),
    scopeOfWork: completedJob.description,
    terms: 'Standard terms apply',
    status: 'CLOSED',
  });

  const invSubmittedItems = [
    { description: 'AC Service (2 units)', quantity: 2, unitPrice: 1800 },
    { description: 'Filters', quantity: 2, unitPrice: 450 },
  ];

  const invSubmitted = await Invoice.create({
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    agent: agent._id,
    contractor: contractor._id,
    invoiceNumber: generateNumber('INV'),
    items: invSubmittedItems,
    currency: 'INR',
    totalAmount: computeTotal(invSubmittedItems),
    status: 'SUBMITTED',
    notes: 'Work in progress - partial billing',
  });

  const invPaidItems = [
    { description: 'Painting labor', quantity: 1, unitPrice: 8500 },
    { description: 'Paint & materials', quantity: 1, unitPrice: 3500 },
  ];

  const invPaid = await Invoice.create({
    job: completedJob._id,
    workOrder: woCompleted._id,
    agent: agent._id,
    contractor: contractor._id,
    invoiceNumber: generateNumber('INV'),
    items: invPaidItems,
    currency: 'INR',
    totalAmount: computeTotal(invPaidItems),
    status: 'PAID',
    approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    notes: 'Final invoice for completed painting job',
  });

  await Notification.create({
    user: agent._id,
    type: 'JOB',
    title: 'New job posted',
    body: `Job created: ${openJob.title}`,
    job: openJob._id,
    read: true,
  });

  await Notification.create({
    user: contractor._id,
    type: 'WORK_ORDER',
    title: 'Work order signed',
    body: `Work order ${woInProgress.workOrderNumber} is signed and active`,
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    read: false,
  });

  await Notification.create({
    user: agent._id,
    type: 'INVOICE',
    title: 'Invoice submitted',
    body: `Invoice ${invSubmitted.invoiceNumber} submitted for ${inProgressJob.title}`,
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    invoice: invSubmitted._id,
    read: false,
  });

  const msg1 = await Message.create({
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    fromUser: agent._id,
    toUser: contractor._id,
    senderRole: 'agent',
    content: 'Hi, can you start AC servicing tomorrow morning?',
  });

  await Message.create({
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    fromUser: contractor._id,
    toUser: agent._id,
    senderRole: 'contractor',
    content: 'Yes, I can start at 10 AM. I will update once the filters are replaced.',
  });

  await ToolsLog.create({
    user: agent._id,
    role: 'agent',
    toolName: 'ANALYTICS_OVERVIEW',
    action: 'VIEW',
    metadata: { seeded: true },
  });

  await Notification.create({
    user: agent._id,
    type: 'CHAT',
    title: 'New message',
    body: 'You have a new chat message on AC servicing job',
    job: inProgressJob._id,
    workOrder: woInProgress._id,
    read: true,
  });

  return {
    skipped: false,
    agentEmail,
    contractorEmail,
    agentPassword,
    contractorPassword,
    jobIds: {
      openJob: String(openJob._id),
      assignedJob: String(assignedJob._id),
      inProgressJob: String(inProgressJob._id),
      completedJob: String(completedJob._id),
    },
    chatMessageId: String(msg1._id),
  };
}

async function main() {
  const drop = process.argv.includes('--drop');

  await connectDb(process.env.MONGODB_URI);

  try {
    const result = await seed({ drop });
    if (result.skipped) {
      console.log('Seed skipped (demo users already exist). Use --drop to reseed.');
    } else {
      console.log('Seed completed.');
    }

    console.log('Demo credentials:');
    console.log(`- Agent: ${result.agentEmail} / ${result.agentPassword}`);
    console.log(`- Contractor: ${result.contractorEmail} / ${result.contractorPassword}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
