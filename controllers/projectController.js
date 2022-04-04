const multer = require("multer");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const Proposal = require("../models/proposalModel");
const Chatroom = require("../models/roomModel");
const Payment = require("../models/paymentModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");
const AppError = require("../utils/appError");
const { filterObj } = require("../utils/fn");
const ProjectService = require("../services/ProjectService");
const StripeService = require("../services/StripeService");
const notification = require("../services/NotificationService");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

//CUSTOMER CREATE NEW PROJECT
exports.createProject = catchAsync(async (req, res, next) => {
  let postProject = req.body;
  let { files } = req;
  postProject.postedBy = req.user._id;

  if (files?.pdfs) {
    postProject.pdfs = await ProjectService.uploadPdfs(files?.pdfs);
  }

  if (files?.projectImages) {
    postProject.images = await ProjectService.uploadImages(
      files?.projectImages
    );
  }

  let newproject = await Project.create(postProject);

  await notification.dispatchToAdmin(
    {
      type: "project",
      message: "New project posted by " + req.user.name,
      title: req.body.title,
      typeId: newproject._id,
    },
    req
  );

  res.status(201).json({
    status: "success",
    data: newproject,
  });
});

//ADMIN SUBMITING NEW PROPOSAL TO CUSTOMER(WHO POSTED PROJECT)-->NEW PROPOSAL WILL AOTUMATICALLY REJECT OLD PROPOSAL FOR THIS PROJECT SENDED TO CUSTOMER
exports.submitPurposalToCustomer = catchAsync(async (req, res, next) => {
  const requiredFromRequest = [
    "projectId",
    "userId",
    "proposalDetails",
    "proposalMilestones",
  ];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { projectId, userId } = req.query;

  const { proposalDetails, proposalMilestones } = req.body;

  proposalDetails.projectId = projectId;
  proposalDetails.sendTo = userId;
  proposalDetails.milestones = proposalMilestones;

  let docs = [];

  if (files?.docs) {
    docs = await ProjectService.uploadDocs(files?.docs);
  }

  proposalDetails.docs = docs;

  await Proposal.updateMany(
    { projectId, sendTo: userId },
    { status: "rejected" }
  );

  let postedPorposal = await Proposal.create(proposalDetails);

  await Project.findByIdAndUpdate(
    projectId,
    {
      $push: { porposalsForCustomer: postedPorposal._id },
      reviewdByAdmin: true,
      projectStatus: "underReview",
    },
    { new: true }
  );

  let admin = await User.findOne({ role: "admin" });

  await Chatroom.create({
    user1: userId,
    user2: admin._id,
    projectId,
    proposalId: postedPorposal._id,
  });

  await notification.dispatch(
    {
      type: "proposal",
      message: req.user.name + " submit new proposal.",
      receiver: userId,
      title: proposalDetails.title,
      typeId: postedPorposal._id,
    },
    req
  );

  res.status(201).json({
    status: "success",
    data: postedPorposal,
  });
});

//ADMIN SUBMITING NEW PROPOSAL TO FREELANCERS(MANY AT A TIME)-->NEW PROPOSAL WILL AOTUMATICALLY REJECT OLD PROPOSAL FOR THIS PROJECT SENDED TO FREELANCER
exports.submitPurposalToFreelancer = catchAsync(async (req, res, next) => {
  const requiredFromRequest = [
    "projectId",
    "userIds", // Array of users to send Proposal
    "proposalDetails",
    "proposalMilestones",
  ];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { projectId } = req.query;

  let { proposalDetails, proposalMilestones, userIds } = req.body;
  let { files } = req;

  proposalDetails.milestones = proposalMilestones;
  proposalDetails.projectId = projectId;

  await Proposal.updateMany(
    { projectId, sendTo: { $in: userIds } },
    { status: "rejected" }
  );

  var Proposals = [];
  var notifications = [];
  let docs = [];

  if (files?.docs) {
    docs = await ProjectService.uploadDocs(files?.docs);
  }

  userIds.map((id) => {
    Proposals.push({ ...proposalDetails, sendTo: id, docs });
  });

  console.log({ Proposals });

  let postedPorposal = await Proposal.insertMany(Proposals);

  let postedProposalsId = [];

  postedPorposal.forEach(function (posted) {
    postedProposalsId.push(posted._id);
    notifications.push({
      type: "proposal",
      message: req.user.name + " send a new  proposal.",
      receiver: posted.sendTo,
      title: posted.title,
      typeId: posted._id,
    });
  });

  await Project.findByIdAndUpdate(
    projectId,
    {
      $push: { porposalsForFreelancer: { $each: postedProposalsId } },
    },
    { new: true }
  );

  await notification.dispatchMany(notifications, req);

  res.status(201).json({
    status: "success",
    data: postedPorposal,
  });
});

//GET ALL PROPOSAL OF THE SINGLE PROJECT FILTERED BY STATUS
exports.getProjectProposals = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["projectId", "proposalStatus", "sendTo"];

  let dataInRequest = { ...req.query };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { projectId, proposalStatus, sendTo } = req.query;

  let proposals = Proposal.find({ projectId, sendTo });

  if (proposalStatus != "all") {
    proposals.find({ status: proposalStatus });
  }

  res.status(200).json({
    status: "success",
    data: await proposals,
  });
});

//CUSTOMER ACCEPT OR REJECT PROPOSAL
//ON ACCEPT -->> FIRST MILESTONE PAYMENT OF THE PROJECT WILL BE PAYED TO ADMIN USING STRIPE
//ON ACCEPT -->> CHAT ROOME WILL BE CREATED FOR ADMIN AND CUSTOMER
exports.CustomerActionOnProposal = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["status", "proposalId"];

  if (req.query.status == "accepted") {
    requiredFromRequest.push("pmId");
  }

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { status, proposalId, pmId } = { ...req.query, ...req.body };

  let proposal = await Proposal.findById(proposalId).populate("projectId");

  if (!proposal.sendTo.equals(req.user._id))
    return next(new AppError("Proposal does not belongs to you.", 403));

  if (proposal.status === "rejected")
    return next(
      new AppError("Rejected proposal cannot be accepted again.", 403)
    );

  if (proposal.status === "accepted")
    return next(new AppError("Already accepted.", 403));

  if (status == "accepted") {
    let paymentIntentId = await StripeService.MakePaymentIntent(
      proposal.milestones[0].amount,
      pmId,
      proposal.projectId.currency,
      req.user.cus
    );

    let newProposal = await Proposal.findOneAndUpdate(
      {
        _id: proposalId,
        "milestones._id": proposal.milestones[0]._id,
      },
      {
        $set: {
          "milestones.$.isMilestonePaid": true,
          "milestones.$.makeReleaseRequest": true,
          "milestones.$.releaseRequestedAt": Date.now(),
          "milestones.$.status": "completed",
        },
      },
      { new: true }
    );

    let payment = await Payment.create({
      amount: newProposal.milestones[0].amount,
      projectId: newProposal.projectId,
      proposalId: newProposal._id,
      paymentMilestone: newProposal.milestones[0],
      paymentMethod: "stripe",
      isPaymentVerified: await StripeService.ConfirmPaymentIntent(
        paymentIntentId,
        pmId,
        next
      ),
      userId: req.user._id,
    });

    await Project.findByIdAndUpdate(
      proposal.projectId,
      {
        amount: proposal.amount,
        projectStatus: "inProgress",
        accecptedPorposalByCustomer: proposal._id,
        $inc: { amountPayedToAdmin: proposal.milestones[0].amount },
      },
      { new: true }
    ).populate("accecptedPorposalByCustomer");

    await notification.dispatchToAdmin(
      {
        type: "payment",
        message:
          req.user.name +
          " payed " +
          (await ProjectService.currencySymbol(proposal.projectId.currency)) +
          proposal.milestones[0].amount +
          " proposal.",
        title: proposal.milestones[0].title,
        typeId: payment._id,
      },
      req
    );
  }

  await notification.dispatchToAdmin(
    {
      type: "proposal",
      message: req.user.name + " " + status + " proposal.",
      title: proposal.title,
      typeId: proposal._id,
    },
    req
  );

  let UpdatedProposal = await Proposal.findByIdAndUpdate(
    proposalId,
    { status },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    data: UpdatedProposal,
  });
});

//FREELANCER ACCEPT OR REJECT PROPOSAL
//ON ACCEPT -->> PROJECT ASSIGNED TO THAT FREELANCER
//ON ACCEPT -->> CHAT ROOM WILL BE CREATED FOR ADMIN AND FREELANCER
exports.FreelancerActionOnProposal = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["status", "proposalId"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { status, proposalId } = req.query;

  let proposal = await Proposal.findById(proposalId);
  let project = await Project.findOne({
    _id: proposal.projectId,
  });

  if (project?.assignTo.equals(req.user._id))
    return next(new AppError("Already assign to you.", 403));

  if (project?.assignTo)
    return next(new AppError("Already assign to Other freelancer.", 403));

  if (!proposal.sendTo.equals(req.user._id))
    return next(new AppError("Proposal does not belongs to you.", 403));

  if (proposal.status === "rejected")
    return next(
      new AppError("Rejected proposal cannot be accepted again.", 403)
    );

  if (proposal.status === "accepted")
    return next(new AppError("Already accepted.", 403));

  if (status == "accepted") {
    await Project.findByIdAndUpdate(
      proposal.projectId,
      {
        amount: proposal.amount,
        projectStatus: "inProgress",
        accecptedPorposalByFreelancer: proposalId,
        assignTo: req.user._id,
        isAssigned: true,
      },
      { new: true }
    );

    await notification.dispatchToAdmin(
      {
        type: "proposal",
        message: req.user.name + " " + status + " proposal.",
        title: proposal.title,
        typeId: proposalId,
      },
      req
    );

    let admin = await User.findOne({ role: "admin" });

    await Chatroom.create({
      user1: admin._id,
      user2: req.user._id,
      projectId: proposal.projectId,
      proposalId: proposalId,
    });
  }

  let UpdatedProposal = await Proposal.findByIdAndUpdate(
    proposalId,
    {
      status,
    },
    { new: true }
  );

  res.status(201).json({
    status: "success",
    data: UpdatedProposal,
  });
});

//ADMIN AND FREELANCER CAN UPDATE THERE MILSTONE WORKING STATUS
exports.UpdateMilestoneStatus = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["milestoneId", "proposalId", "status"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { milestoneId, proposalId, status } = { ...req.query, ...req.body };

  if (status === "completed") {
    // send email/dashboard notification to admin
  }

  let milestone;
  let proposal = await Proposal.findOne(
    { _id: proposalId },
    function (err, proposal) {
      milestone = proposal.milestones.id(milestoneId);
    }
  );

  let updatedPro = await Proposal.findOneAndUpdate(
    {
      _id: proposalId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$.status": status,
      },
    },
    { new: true }
  );

  if (req.user.role == "admin") {
    await notification.dispatch(
      {
        type: "milestone",
        message: req.user.name + " change milestone status to " + status,
        receiver: proposal.sendTo,
        title: milestone.title,
        typeId: milestoneId,
      },
      req
    );
  } else {
    await notification.dispatchToAdmin(
      {
        type: "milestone",
        message: req.user.name + " change milestone status to " + status,
        title: milestone.title,
        typeId: milestoneId,
      },
      req
    );
  }

  res.status(201).json({
    status: "success",
    data: updatedPro,
  });
});

//ADMIN CAN UPDATE MILSTONE PAYMENT STATUS on freelancer Proposal
exports.updateMilestonePaymentStatus = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["milestoneId", "proposalId", "ispaid"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { milestoneId, proposalId, ispaid } = req.query;

  let milestone;
  let proposal = await Proposal.findOne(
    { _id: proposalId },
    function (err, proposal) {
      milestone = proposal.milestones.id(milestoneId);
    }
  ).populate("projectId");

  if (proposal.projectId.accecptedPorposalByFreelancer != proposalId) {
    return next(new AppError("Not a freelancer proposal", 403));
  }

  if (milestone.isMilestonePaid == true) {
    return next(new AppError("Milestone already payed. ", 403));
  }

  if (milestone.status != "completed") {
    return next(
      new AppError(
        "Milestone is not completed yet, cannot update payment status. ",
        403
      )
    );
  }

  let UpdateMilestone = await Proposal.findOneAndUpdate(
    {
      _id: proposalId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$.isMilestonePaid": ispaid,
      },
    },
    { new: true }
  );

  if (ispaid == "true") {
    await Project.findByIdAndUpdate(proposal.projectId, {
      $inc: { amountPayedToFreelancer: milestone.amount },
    });

    let updatedMilestone;
    await Proposal.findOne({ _id: proposalId }, function (err, proposal) {
      updatedMilestone = proposal.milestones.id(milestoneId);
    });

    console.log({ updatedMilestone });

    let payment = await Payment.create({
      amount: updatedMilestone.amount,
      projectId: proposal.projectId,
      proposalId: proposal._id,
      paymentMilestone: updatedMilestone,
      paymentMethod: "cash",
      isPaymentVerified: true,
      userId: req.user._id,
      reciverId: proposal.sendTo,
    });
  }

  // send email/dashboard notification to freelancer

  await notification.dispatch(
    {
      type: "milestone",
      message:
        req.user.name + " change milestone payment to " + ispaid
          ? "paid"
          : "unpaid",
      receiver: proposal.sendTo,
      title: milestone.title,
      typeId: milestoneId,
    },
    req
  );

  res.status(201).json({
    status: "success",
    data: UpdateMilestone,
  });
});

//FREELANCER REQUEST WIDTHDRAWL FROM ADMIN
exports.MakeMilestoneWidthdrawlRequest = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["milestoneId", "proposalId"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { milestoneId, proposalId } = { ...req.query, ...req.body };

  let milestone;
  await Proposal.findOne({ _id: proposalId }, function (err, proposal) {
    milestone = proposal.milestones.id(milestoneId);
  });

  if (milestone.status != "completed") {
    return next(
      new AppError(
        "Cannot create widthrawl request with " +
          milestone.status +
          " milestone. ",
        403
      )
    );
  }

  if (milestone.isMilestonePaid == true) {
    return next(new AppError("Milestone already payed. ", 403));
  }

  let pdfname = `${uuidv4()}.pdf`;

  const _path = path.join(__dirname, "public", "pdfs", pdfname);

  let UpdatedMilestone = await Proposal.findOneAndUpdate(
    {
      _id: proposalId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$.makeWidthDrawlRequest": true,
        "milestones.$.widthDrawlRequestedAt": Date.now(),
        "milestones.$.invoice": pdfname,
      },
    },
    { new: true }
  )
    .populate("projectId")
    .populate("sendTo");

  let updatedMile = UpdatedMilestone.milestones.map((item) => {
    if (item._id == milestoneId) {
      return item;
    }
  });

  let invoice = {
    user: UpdatedMilestone.sendTo,
    from: {
      name: req.user.name,
      email: req.user.email,
    },
    project: UpdatedMilestone.projectId,
    milestone: updatedMile,
  };

  PdfGeneratingService.createInvoice(invoice, _path);

  await notification.dispatchToAdmin(
    {
      type: "milestone",
      message: req.user.name + " created widthdrawl request on milestone.",
      title: milestone.title,
      typeId: milestoneId,
    },
    req
  );

  res.status(200).json({
    status: "success",
    data: UpdatedMilestone,
  });
});

//ADMIN REQUEST PAYMENT RELEASE FROM CUSTOMER
exports.MakeMilestoneReleaseRequest = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["milestoneId", "proposalId"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { milestoneId, proposalId } = { ...req.query, ...req.body };

  let milestone;
  let proposal = await Proposal.findOne(
    { _id: proposalId },
    function (err, proposal) {
      milestone = proposal.milestones.id(milestoneId);
    }
  );

  if (milestone.status != "completed") {
    return next(
      new AppError(
        "Cannot create release request with " +
          milestone.status +
          " milestone. ",
        403
      )
    );
  }

  if (milestone.isMilestonePaid == true) {
    return next(new AppError("Milestone already payed. ", 403));
  }

  let pdfname = `${uuidv4()}.pdf`;

  const _path = path.join(__dirname, "public", "pdfs", pdfname);

  let UpdatedMilestone = await Proposal.findOneAndUpdate(
    {
      _id: proposalId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$.makeReleaseRequest": true,
        "milestones.$.releaseRequestedAt": Date.now(),
        "milestones.$.invoice": pdfname,
      },
    },
    { new: true }
  )
    .populate("projectId")
    .populate("sendTo");

  let updatedMile = UpdatedMilestone.milestones.map((item) => {
    if (item._id == milestoneId) {
      return item;
    }
  });

  let invoice = {
    user: UpdatedMilestone.sendTo,
    from: {
      name: req.user.name,
      email: req.user.email,
    },
    project: UpdatedMilestone.projectId,
    milestone: updatedMile,
  };

  PdfGeneratingService.createInvoice(invoice, _path);

  await notification.dispatch(
    {
      type: "milestone",
      message: req.user.name + " create milestone release request.",
      receiver: proposal.sendTo,
      title: milestone.title,
      typeId: milestoneId,
    },
    req
  );

  res.status(200).json({
    status: "success",
    data: UpdatedMilestone,
  });
});

//CUSTOMER WILL RELEASE MILESTONE TO ADMIN USING STRIPE
exports.CustomerPayToAdmin = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["milestoneId", "proposalId", "pmId"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { milestoneId, proposalId, pmId } = req.query;

  var milestone;
  let proposal = await Proposal.findOne(
    { _id: proposalId },
    function (err, proposal) {
      milestone = proposal.milestones.id(milestoneId);
    }
  ).populate("projectId");

  if (milestone.makeReleaseRequest != true) {
    next(new AppError("Milestone release not requested by admin. ", 403));
  }
  if (milestone.isMilestonePaid == true) {
    next(new AppError("Milestone already payed. ", 403));
  }

  if (milestone.status != "completed") {
    return next(
      new AppError(
        "Milestone is not completed yet, cannot update payment status. ",
        403
      )
    );
  }

  let paymentIntentId = await StripeService.MakePaymentIntent(
    milestone.amount,
    pmId,
    proposal.projectId.currency,
    req.user.cus
  );

  let UpdateMilestone = await Proposal.findOneAndUpdate(
    {
      _id: proposalId,
      "milestones._id": milestoneId,
    },
    {
      $set: {
        "milestones.$.isMilestonePaid": true,
        "milestones.$.releaseRequestedAt": Date.now(),
      },
    },
    { new: true }
  );

  var UpdatedMilestone;
  await Proposal.findOne({ _id: proposalId }, function (err, proposal) {
    UpdatedMilestone = proposal.milestones.id(milestoneId);
  });

  let payment = await Payment.create({
    amount: milestone.amount,
    projectId: proposal.projectId,
    proposalId: proposal._id,
    paymentMilestone: UpdatedMilestone,
    paymentMethod: "stripe",
    isPaymentVerified: await StripeService.ConfirmPaymentIntent(
      paymentIntentId,
      pmId,
      next
    ),
    userId: req.user._id,
  });

  let project = await Project.findByIdAndUpdate(proposal.projectId, {
    $inc: { amountPayedToAdmin: UpdatedMilestone.amount },
  });

  // send email/dashboard notification to admin

  await notification.dispatchToAdmin(
    {
      type: "payment",
      message:
        req.user.name +
        " release milestone payment of " +
        (await ProjectService.currencySymbol(project.currency)) +
        milestone.amount,
      title: milestone.title,
      typeId: payment._id,
    },
    req
  );

  res.status(200).json({
    status: "success",
    data: UpdateMilestone,
  });
});

exports.getAllProjects = catchAsync(async (req, res, next) => {
  let postProject = req.body;
  postProject.postedBy = req.user._id;
  let newproject = await Project.create(postProject);
  res.status(201).json({
    status: "success",
    data: newproject,
  });
});
