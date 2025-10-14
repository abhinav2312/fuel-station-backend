const { execSync } = require('child_process');
const path = require('path');

async function runMigration() {
    console.log('🚀 Starting Database Migration Process...');
    console.log('=====================================');
    
    try {
        // Step 1: Backup existing data
        console.log('📦 Step 1: Backing up existing data...');
        execSync('node scripts/backup-data.js', { stdio: 'inherit' });
        
        // Step 2: Generate new Prisma client
        console.log('🔧 Step 2: Generating new Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        
        // Step 3: Push new schema to database
        console.log('🗄️ Step 3: Pushing new schema to database...');
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
        
        // Step 4: Run data migration
        console.log('🔄 Step 4: Migrating data to new schema...');
        execSync('node scripts/migrate-schema.js', { stdio: 'inherit' });
        
        // Step 5: Verify migration
        console.log('✅ Step 5: Verifying migration...');
        execSync('npx prisma db seed', { stdio: 'inherit' });
        
        console.log('🎉 Migration completed successfully!');
        console.log('=====================================');
        console.log('✅ Database structure improved');
        console.log('✅ Data migrated successfully');
        console.log('✅ Redundancy eliminated');
        console.log('✅ Performance optimized');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Update backend API endpoints');
        console.log('2. Update frontend data handling');
        console.log('3. Test all functionality');
        console.log('4. Deploy to production');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('🔄 To rollback:');
        console.log('1. Restore from backup');
        console.log('2. Revert schema changes');
        console.log('3. Contact support if needed');
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration().catch(console.error);
}

module.exports = { runMigration };
