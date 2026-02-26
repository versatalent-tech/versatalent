import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Helper function for parameterized queries
async function query(queryText: string, params: any[]) {
  const client = neon(DATABASE_URL);
  return client(queryText, params);
}

async function testUpdate() {
  try {
    console.log('🧪 Testing v201 SQL Parameter Fix\n');

    // Test 1: Create a test talent
    console.log('📝 Step 1: Creating test talent...');
    const createResult = await sql`
      INSERT INTO talents (
        name, industry, gender, age_group, profession, location,
        bio, tagline, skills, image_src, featured, is_active
      ) VALUES (
        ${'Test Artist ' + Date.now()},
        'music',
        'male',
        'adult',
        'DJ',
        'Test City',
        'Test bio',
        'Test tagline',
        ${['Skill1', 'Skill2']},
        'https://test.com/image.jpg',
        false,
        true
      )
      RETURNING id, name, profession
    `;
    
    const talentId = createResult[0].id;
    console.log(`✅ Created talent: ${createResult[0].name} (ID: ${talentId})\n`);

    // Test 2: Test the actual repository function directly
    console.log('🔄 Step 2: Testing actual repository updateTalent function...');
    
    const { updateTalent } = await import('./src/lib/db/repositories/talents.js');
    
    const repoUpdateResult = await updateTalent(talentId, {
      name: 'Updated Name',
      profession: 'Music Producer',
      tagline: 'Updated tagline - ' + Date.now(),
      featured: true
    });

    if (repoUpdateResult) {
      console.log('✅ Repository update SUCCESSFUL!');
      console.log(`   - Name: ${repoUpdateResult.name}`);
      console.log(`   - Profession: ${repoUpdateResult.profession}`);
      console.log(`   - Tagline: ${repoUpdateResult.tagline}`);
      console.log(`   - Featured: ${repoUpdateResult.featured}`);
      console.log('');
    } else {
      console.error('❌ Repository update FAILED - returned null');
      process.exit(1);
    }

    // Test 3: Verify the changes persisted
    console.log('🔍 Step 3: Verifying changes persisted...');
    const verifyResult = await sql`
      SELECT name, profession, tagline, featured
      FROM talents
      WHERE id = ${talentId}
    `;

    if (verifyResult[0].name === 'Updated Name' &&
        verifyResult[0].profession === 'Music Producer' &&
        verifyResult[0].featured === true) {
      console.log('✅ VERIFICATION PASSED! All changes persisted correctly.');
      console.log('');
    } else {
      console.error('❌ VERIFICATION FAILED: Changes did not persist');
      console.error('Expected:', { name: 'Updated Name', profession: 'Music Producer', featured: true });
      console.error('Got:', verifyResult[0]);
      process.exit(1);
    }

    // Test 4: Test another update
    console.log('🔄 Step 4: Testing second update...');
    const secondUpdate = await updateTalent(talentId, {
      profession: 'DJ & Producer',
      bio: 'Updated bio - ' + Date.now()
    });

    if (secondUpdate) {
      console.log('✅ Second update SUCCESSFUL!');
      console.log(`   - Profession: ${secondUpdate.profession}`);
      console.log(`   - Bio: ${secondUpdate.bio}`);
      console.log('');
    } else {
      console.error('❌ Second update FAILED');
      process.exit(1);
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await sql`DELETE FROM talents WHERE id = ${talentId}`;
    console.log('✅ Test data cleaned up');
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED! v201 SQL Parameter Fix is WORKING!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Repository updateTalent function: WORKING');
    console.log('✅ Multi-field updates: WORKING');
    console.log('✅ Data persistence: WORKING');
    console.log('✅ SQL with $ prefix: WORKING');
    console.log('');
    console.log('🚀 Ready to deploy to GitHub!');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ TEST FAILED!');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testUpdate();
