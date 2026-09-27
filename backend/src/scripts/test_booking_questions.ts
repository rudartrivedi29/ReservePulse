import { QuestionService } from '../services/question.service';
import { BookingService } from '../services/booking.service';
import { BadRequestError } from '../utils/errors';
import { createApp } from '../app';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import type { Server } from 'http';

/**
 * Test Suite for Configurable Booking Questions
 * 
 * Verifies:
 * 1. Organisers can create questions with types 'text', 'textarea', 'select' with options.
 * 2. Organisers can edit question prompt, options, and toggle requirement flags.
 * 3. Organisers can reorder questions and verify orderIndex sorting.
 * 4. Organisers can delete questions.
 * 5. Customer booking rejects missing required answers.
 * 6. Customer booking rejects invalid choices for 'select' questions.
 * 7. Customer booking successfully records valid answers in booking_answers.
 * 8. REST API endpoints for question management work with authenticated organiser tokens.
 */
async function runBookingQuestionTests() {
  console.log('================================================================');
  console.log('📝 ReservePulse Configurable Booking Questions Verification Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: unknown) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
    passedTests++;
    console.log(`✓ [${passedTests}] ${testName}`);
  }

  const testServiceId = 'srv_suite_002'; // Executive Consultation Suite (organiserId: usr_organiser_002)
  const organiserUser = {
    id: 'usr_organiser_002',
    email: 'organiser@reservepulse.com',
    role: 'ORGANISER' as const,
    fullName: 'Executive Host',
    isVerified: true,
  };

  // -------------------------------------------------------------------------
  // 1. QUESTION CREATION (TEXT, TEXTAREA, SELECT)
  // -------------------------------------------------------------------------
  console.log('--- 1. QUESTION CREATION (TEXT, TEXTAREA, SELECT) ---');
  {
    // Question 1: Text format
    const q1 = await QuestionService.createQuestion(
      testServiceId,
      {
        questionText: 'Primary Meeting Objective or Key Stakeholders',
        questionType: 'text',
        isRequired: true,
      },
      organiserUser
    );
    assert(q1.questionType === 'text', 'Creates text question');
    assert(q1.isRequired === true, 'Sets question as required');
    assert(q1.serviceId === testServiceId, 'Associates question with target service');

    // Question 2: Select format with options
    const q2 = await QuestionService.createQuestion(
      testServiceId,
      {
        questionText: 'Selected Telepresence Mode',
        questionType: 'select',
        options: ['Dual 4K Presentation Mode', 'Virtual Teams Bridge', 'Acoustic Silence Only'],
        isRequired: true,
      },
      organiserUser
    );
    assert(q2.questionType === 'select', 'Creates select question');
    assert(q2.options.length === 3, 'Persists 3 selectable options');
    assert(q2.options.includes('Virtual Teams Bridge'), 'Contains specified option value');

    // Question 3: Textarea format (optional)
    const q3 = await QuestionService.createQuestion(
      testServiceId,
      {
        questionText: 'Special Dietary or Technical Setup Instructions',
        questionType: 'textarea',
        isRequired: false,
      },
      organiserUser
    );
    assert(q3.questionType === 'textarea', 'Creates textarea question');
    assert(q3.isRequired === false, 'Sets question as optional');

    // Verify rejection if 'select' question lacks options
    let selectWithoutOptionsFailed = false;
    try {
      await QuestionService.createQuestion(
        testServiceId,
        {
          questionText: 'Invalid Select Without Choices',
          questionType: 'select',
          options: [],
        },
        organiserUser
      );
    } catch (err) {
      selectWithoutOptionsFailed = true;
      assert(err instanceof BadRequestError, 'Rejects select question without choices');
    }
    assert(selectWithoutOptionsFailed, 'Enforces select questions have choices');
  }

  // -------------------------------------------------------------------------
  // 2. QUESTION EDITING & REQUIREMENT TOGGLING
  // -------------------------------------------------------------------------
  console.log('\n--- 2. QUESTION EDITING & REQUIREMENT TOGGLING ---');
  {
    const questions = await QuestionService.getQuestionsForService(testServiceId);
    const textareaQ = questions.find((q) => q.questionType === 'textarea')!;

    // Edit textarea question to be required and update prompt
    const updated = await QuestionService.updateQuestion(
      testServiceId,
      textareaQ.id,
      {
        questionText: 'Detailed Technical Environment Requirements (Mandatory)',
        isRequired: true,
      },
      organiserUser
    );

    assert(
      updated.questionText === 'Detailed Technical Environment Requirements (Mandatory)',
      'Updates question prompt text'
    );
    assert(updated.isRequired === true, 'Toggles question requirement from optional to mandatory');

    // Edit select options
    const selectQ = questions.find((q) => q.questionType === 'select')!;
    const updatedSelect = await QuestionService.updateQuestion(
      testServiceId,
      selectQ.id,
      {
        options: ['Studio Audio Only', 'Interactive 4K Broadcast'],
      },
      organiserUser
    );
    assert(updatedSelect.options.length === 2, 'Updates selectable options list');
    assert(updatedSelect.options[1] === 'Interactive 4K Broadcast', 'Matches new option value');
  }

  // -------------------------------------------------------------------------
  // 3. QUESTION REORDERING
  // -------------------------------------------------------------------------
  console.log('\n--- 3. QUESTION REORDERING ---');
  {
    const initialList = await QuestionService.getQuestionsForService(testServiceId);
    assert(initialList.length >= 2, 'Has at least 2 questions to test reordering');

    const reversedIds = [...initialList].reverse().map((q) => q.id);
    const reorderedList = await QuestionService.reorderQuestions(
      testServiceId,
      { questionIds: reversedIds },
      organiserUser
    );

    assert(
      reorderedList[0].id === reversedIds[0],
      `First question is now ${reversedIds[0]} after reordering`
    );
    assert(
      reorderedList[reorderedList.length - 1].id === reversedIds[reversedIds.length - 1],
      'Last question matches new order'
    );
  }

  // -------------------------------------------------------------------------
  // 4. QUESTION DELETION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. QUESTION DELETION ---');
  {
    // Create a temporary question to delete
    const tempQ = await QuestionService.createQuestion(
      testServiceId,
      {
        questionText: 'Disposable Question for Deletion Test',
        questionType: 'text',
      },
      organiserUser
    );

    const countBefore = (await QuestionService.getQuestionsForService(testServiceId)).length;
    await QuestionService.deleteQuestion(testServiceId, tempQ.id, organiserUser);
    const countAfter = (await QuestionService.getQuestionsForService(testServiceId)).length;

    assert(countAfter === countBefore - 1, 'Question count decreased by exactly 1');
    const remaining = await QuestionService.getQuestionsForService(testServiceId);
    assert(!remaining.some((q) => q.id === tempQ.id), 'Deleted question is no longer present');
  }

  // -------------------------------------------------------------------------
  // 5. CUSTOMER BOOKING VALIDATION WITH ACTIVE QUESTIONS
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CUSTOMER BOOKING VALIDATION & SUBMISSION ---');
  {
    const resourceId = 'res_pod_private_1';
    const activeQuestions = await QuestionService.getQuestionsForService(testServiceId);
    const requiredQuestions = activeQuestions.filter((q) => q.isRequired);
    assert(requiredQuestions.length > 0, 'Service has required intake questions configured');

    const selectQ = activeQuestions.find((q) => q.questionType === 'select');
    assert(!!selectQ, 'Service has a select question configured');

    // Case 5.1: Missing required question answers -> must reject
    let missingReqRejected = false;
    try {
      await BookingService.createBooking({
        serviceId: testServiceId,
        resourceId,
        startDateTime: '2026-11-26T10:00:00.000Z',
        attendeeCount: 1,
        customerName: 'Test Incomplete Guest',
        customerEmail: 'incomplete@reservepulse.test',
        answers: [], // Intentionally empty!
      });
    } catch (err: any) {
      missingReqRejected = true;
      assert(
        err instanceof BadRequestError && err.message.includes('Missing required booking answer'),
        `Rejects booking when required question is unanswered: "${err.message}"`
      );
    }
    assert(missingReqRejected, 'Customer booking strictly blocked without required answers');

    // Case 5.2: Invalid option for 'select' question -> must reject
    let invalidOptionRejected = false;
    try {
      const answersPayload = activeQuestions.map((q) => ({
        questionId: q.id,
        answerText: q.id === selectQ!.id ? 'NON_EXISTENT_OPTION_CHOICE' : 'Valid Text Answer',
      }));

      await BookingService.createBooking({
        serviceId: testServiceId,
        resourceId,
        startDateTime: '2026-11-26T11:00:00.000Z',
        attendeeCount: 1,
        customerName: 'Test Invalid Option Guest',
        customerEmail: 'invalid_option@reservepulse.test',
        answers: answersPayload,
      });
    } catch (err: any) {
      invalidOptionRejected = true;
      assert(
        err instanceof BadRequestError && err.message.includes('Invalid option'),
        `Rejects booking when unlisted option is chosen: "${err.message}"`
      );
    }
    assert(invalidOptionRejected, 'Customer booking rejects invalid dropdown choice');

    // Case 5.3: Valid answers matching all required questions and allowed options -> must succeed
    const validChoice = selectQ!.options[0];
    const validAnswers = activeQuestions.map((q) => {
      let answerText = 'Enterprise System Review and Sign-off';
      if (q.questionType === 'select' && q.options && q.options.length > 0) {
        answerText = q.options[0];
      }
      return {
        questionId: q.id,
        answerText,
      };
    });

    const successfulBooking = await BookingService.createBooking({
      serviceId: testServiceId,
      resourceId,
      startDateTime: '2026-11-26T14:00:00.000Z',
      attendeeCount: 1,
      customerName: 'Morgan Vance',
      customerEmail: 'morgan.vance@reservepulse.test',
      answers: validAnswers,
    });

    assert(
      !!successfulBooking.bookingReference,
      `Customer booking confirmed: ${successfulBooking.bookingReference}`
    );
    assert(
      successfulBooking.answers.length === validAnswers.length,
      `All ${validAnswers.length} answers successfully stored against the booking`
    );

    const savedSelectAnswer = successfulBooking.answers.find((a) => a.questionId === selectQ!.id);
    assert(
      savedSelectAnswer?.answerText === validChoice,
      `Stored answer text matches chosen option: "${validChoice}"`
    );
  }

  // -------------------------------------------------------------------------
  // 6. HTTP REST API QUESTION MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 6. HTTP REST API QUESTION MANAGEMENT ENDPOINTS ---');
  {
    const app = createApp();
    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const token = jwt.sign(
      {
        id: organiserUser.id,
        email: organiserUser.email,
        role: organiserUser.role,
        fullName: organiserUser.fullName,
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    try {
      // 6.1 Public GET /api/v1/services/:serviceId/questions
      const publicRes = await fetch(`${baseUrl}/services/${testServiceId}/questions`);
      const publicBody = await publicRes.json();
      assert(publicRes.status === 200, 'Public GET /services/:id/questions returns 200');
      assert(Array.isArray(publicBody.data), 'Returns questions array for customer booking');

      // 6.2 Organiser POST /api/v1/organiser/services/:serviceId/questions
      const createRes = await fetch(`${baseUrl}/organiser/services/${testServiceId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText: 'Security Clearance Level',
          questionType: 'select',
          options: ['Public Trust', 'Secret', 'Top Secret / SCI'],
          isRequired: true,
        }),
      });
      const createBody = await createRes.json();
      assert(createRes.status === 201, 'POST /organiser/services/:id/questions returns 201');
      assert(createBody.data.questionText === 'Security Clearance Level', 'Returns created question');

      const createdQId = createBody.data.id;

      // 6.3 Organiser PUT /api/v1/organiser/services/:serviceId/questions/:questionId
      const updateRes = await fetch(
        `${baseUrl}/organiser/services/${testServiceId}/questions/${createdQId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionText: 'Facility Security Clearance Level (Updated)',
            isRequired: false,
          }),
        }
      );
      const updateBody = await updateRes.json();
      assert(updateRes.status === 200, 'PUT /organiser/services/:id/questions/:id returns 200');
      assert(
        updateBody.data.questionText === 'Facility Security Clearance Level (Updated)',
        'Returns updated question'
      );
      assert(updateBody.data.isRequired === false, 'Updated isRequired persisted');

      // 6.4 Organiser DELETE /api/v1/organiser/services/:serviceId/questions/:questionId
      const deleteRes = await fetch(
        `${baseUrl}/organiser/services/${testServiceId}/questions/${createdQId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      assert(deleteRes.status === 200, 'DELETE /organiser/services/:id/questions/:id returns 200');
    } finally {
      await new Promise<void>((resolve) => {
        if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        server.close(() => resolve());
      });
    }
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 ALL BOOKING QUESTION TESTS PASSED! (${passedTests}/${totalTests} verified)`);
  console.log('================================================================\n');
}

// Execute suite
runBookingQuestionTests()
  .then(() => {
    setTimeout(() => {
      process.exit(0);
    }, 100);
  })
  .catch((err) => {
    console.error('\n❌ BOOKING QUESTIONS TEST SUITE ENCOUNTERED UNEXPECTED ERROR:');
    console.error(err);
    process.exit(1);
  });
