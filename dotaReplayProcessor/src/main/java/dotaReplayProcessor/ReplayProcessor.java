package dotaReplayProcessor;
import java.util.Arrays;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import skadistats.clarity.model.CombatLogEntry;
import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;
import skadistats.clarity.model.StringTable;
import skadistats.clarity.processor.entities.Entities;
import skadistats.clarity.processor.entities.OnEntityCreated;
import skadistats.clarity.processor.entities.OnEntityDeleted;
import skadistats.clarity.processor.entities.OnEntityUpdated;
import skadistats.clarity.processor.entities.UsesEntities;
import skadistats.clarity.processor.gameevents.OnCombatLogEntry;
import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.ControllableRunner;
import skadistats.clarity.processor.runner.SimpleRunner;
import skadistats.clarity.processor.stringtables.OnStringTableCreated;
import skadistats.clarity.processor.stringtables.OnStringTableEntry;
import skadistats.clarity.source.MappedFileSource;
import javax.vecmath.Vector2d;
import javax.vecmath.Vector2f;

import com.google.protobuf.ByteString;

import skadistats.clarity.decoder.Util;
import java.util.HashMap;

public class ReplayProcessor {
	MappedFileSource file_source;
	OutputGenerator output;
	private static int MAX_COORD_INTEGER = 16384;
    HashMap<Integer, String> entity_names = new HashMap<Integer, String>();
    HashMap<Integer, String> cl_names = new HashMap<Integer, String>();
	
	boolean init = false;
    Integer time = 0;
    int numPlayers = 10;
    int[] validIndices = new int[numPlayers];
	
	Map<String, Integer> hero_indices;
	Map<String, Double> data_fields;
	
	public ReplayProcessor(String filename_replay, OutputGenerator output) throws IOException {
		file_source = new MappedFileSource(filename_replay);

		data_fields = new HashMap<String, Double>();
		data_fields.put("time", 0.0);
    	for(int i = 0; i < 10; ++i)
    	{
    		data_fields.put(i+"X", 0.0);
        	data_fields.put(i+"Y", 0.0);
        	data_fields.put(i+"HP", 0.0);
        	data_fields.put(i+"MaxHP", 0.0);
          	data_fields.put(i+"Mana", 0.0);
          	data_fields.put(i+"MaxMana", 0.0);
    		data_fields.put(i+"Alive", 1.0); //start as dead
    	}
		this.output = output;
		this.output.init(data_fields);
		hero_indices = new HashMap<String, Integer>();
	}

	public void process() throws IOException {
		ControllableRunner runner = new ControllableRunner(file_source);
		runner.runWith(this);
        while(!runner.isAtEnd()) {
            runner.tick();
            output.writeTick(data_fields);
        }
        runner.halt();
		//new SimpleRunner(file_source).runWith(this);
	}
	
	@UsesEntities
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic) {
        //s1 DT_DOTAGameRulesProxy
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
        Entity pr = ctx.getProcessor(Entities.class).getByDtName("CDOTA_PlayerResource");
        Entity dData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataDire");
        Entity rData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataRadiant");

        if (grp != null) {
        	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
        	Double time = (double) t;
            data_fields.put("time", time);
        }
        if (pr != null) {
            //Radiant coach shows up in vecPlayerTeamData as position 5
            //all the remaining dire entities are offset by 1 and so we miss reading the last one and don't get data for the first dire player
            //coaches appear to be on team 1, radiant is 2 and dire is 3?
            //construct an array of valid indices to get vecPlayerTeamData from
            if (!init) {
                int added = 0;
                int i = 0;
                //according to @Decoud Valve seems to have fixed this issue and players should be in first 10 slots again
                //sanity check of i to prevent infinite loop when <10 players?
                while (added < numPlayers && i < 100) {
                    //check each m_vecPlayerData to ensure the player's team is radiant or dire
                    int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", i);
                    if (playerTeam == 2 || playerTeam == 3) {
                        //if so, add it to validIndices, add 1 to added
                        validIndices[added] = i;
                        added += 1;
                    }

                    i += 1;
                }
                init = true;
            }

            //System.err.println(pr);
            for (int i = 0; i < numPlayers; i++) {
                //Integer hero = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_nSelectedHeroID", validIndices[i]);
                int handle = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_hSelectedHero", validIndices[i]);
                //Long steamid = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerSteamID", validIndices[i]);
                int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", validIndices[i]);
                int teamSlot = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_iTeamSlot", validIndices[i]);
                //System.err.format("hero:%s i:%s teamslot:%s playerteam:%s\n", hero, i, teamSlot, playerTeam);
                
                //2 is radiant, 3 is dire, 1 is other?
                Entity dataTeam = playerTeam == 2 ? rData : dData;

                //Entry entry = new Entry(time);
                //entry.type = "interval";
                //entry.slot = i;
                
                int gold = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedGold", teamSlot);
                //entry.lh = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iLastHitCount", teamSlot);
                //entry.xp = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedXP", teamSlot);
                //entry.stuns = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_fStuns", teamSlot);

                //TODO: gem, rapier time?
                //https://github.com/yasp-dota/yasp/issues/333
                //need to dump inventory items for each player and possibly keep track of item entity handles

                //time dead, count number of intervals where this value is >0?
                //m_iRespawnSeconds.0000

                //get the player's hero entity
                Entity e = ctx.getProcessor(Entities.class).getByHandle(handle);
                //get the hero's coordinates
                if (e != null) {
                    //System.err.println(e);
            	    Vector2f pos = computePosition(e);
            	    
                    //int alive = getEntityProperty(e, "m_iLifeState", null);
                    //System.err.format("%s, %s\n", entry.x, entry.y);
                    //get the hero's entity name, ex: CDOTA_Hero_Zuus
                    //entry.unit = e.getDtClass().getDtName();
                    //entry.hero_id = hero;
                    
                    data_fields.put(i+"X", (double)pos.x);
                    data_fields.put(i+"Y", (double)pos.y);
                	data_fields.put(i+"HP", ((Integer)getEntityProperty(e, "m_iHealth", null)).doubleValue());
                	data_fields.put(i+"MaxHP", ((Integer)getEntityProperty(e, "m_iMaxHealth", null)).doubleValue());
                  	data_fields.put(i+"Mana", ((Float)getEntityProperty(e, "m_flMana", null)).doubleValue());
                  	data_fields.put(i+"MaxMana", ((Float)getEntityProperty(e, "m_flMaxMana", null)).doubleValue());
            		data_fields.put(i+"Alive", ((Integer)getEntityProperty(e, "m_lifeState", null)).doubleValue());
                }
                //es.output(entry);

            }
            output.writeTick(data_fields);
        }
    }

	public Vector2f computePosition(Entity e)
	{
		int cell_x = getEntityProperty(e, "CBodyComponent.m_cellX", null);
		int cell_y = getEntityProperty(e, "CBodyComponent.m_cellY", null);
	    float offsetx = getEntityProperty(e, "CBodyComponent.m_vecX", null);
	    float offsety = getEntityProperty(e, "CBodyComponent.m_vecY", null);
	    int cellbits = 7;//getEntityProperty(e, "CBodyComponent.m_cellbits", null);
	    
	    int cellwidth = 1 << cellbits;
	    Vector2f pos = new Vector2f();
	    pos.x = (float)(((cell_x * cellwidth) - MAX_COORD_INTEGER) + (double)offsetx);
	    pos.y = (float) (((cell_y * cellwidth) - MAX_COORD_INTEGER) + (double)offsety);
	    
	    return pos;
	}

	public <T> T getEntityProperty(Entity e, String property, Integer idx) {
        if (e == null) {
            return null;
        }
        if (idx != null) {
            property = property.replace("%i", Util.arrayIdxToString(idx));
        }
        FieldPath fp = e.getDtClass().getFieldPathForName(property);
        if(fp==null)
        	return null;
        else
        	return e.getPropertyForFieldPath(fp);
    }
	

    private String getAttackerNameCompiled(CombatLogEntry cle) {
        return cle.getAttackerName() + (cle.isAttackerIllusion() ? " (illusion)" : "");
    }

    private String getTargetNameCompiled(CombatLogEntry cle) {
        return cle.getTargetName() + (cle.isTargetIllusion() ? " (illusion)" : "");
    }
    
    /*@OnStringTableCreated
    public void onStringTableCreated(Context ctx, int a,  StringTable stringTable) {
    	output.writeEntityEvent("new table", time, a+" "+stringTable.getName());
    }*/
    
    @OnStringTableEntry("EntityNames")
    public void onStringTableEntry(Context ctx, StringTable stringTable, int rowIndex, String key, ByteString bs) {
    	// output.writeEntityEvent("strtab", time, rowIndex+" - "+key);
	    entity_names.put(rowIndex, key);
    }
    @OnStringTableEntry("CombatLogNames")
    public void onCLEntry(Context ctx, StringTable stringTable, int rowIndex, String key, ByteString bs) {
    	// output.writeEntityEvent("strtab", time, rowIndex+" - "+key);
	    cl_names.put(rowIndex, key);
    }
    

    @OnEntityCreated
    public void onEntityCreated(Context ctx, Entity e) {
    	 double time = 0;
         Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
 		if (grp != null) {
         	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
     		time = t;
         }
 		
    	//output.writeEntityEvent("create", time, e.getDtClass().getDtName()+", "+e.getHandle());//.toString()
    }
    
    @OnEntityUpdated
    public void onEntityUpdated(Context ctx, Entity e, FieldPath[] fields, int a) {
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
        double time = 0;
		if (grp != null) {
        	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
    		time = t;
        }
        
    	String updates = "[";
    	int n_ignored = 0;
    	String[] ignored_ents = {"CDOTAPlayer", "CDOTAWearableItem"};
    	String[] checked_ents = {};//"CDOTA_BaseNPC_Creep_Lane"};
    	String[] ignored_fields = {"m_pGameRules.m_fGameTime", "m_pGameRules.m_iFoWFrameNumber", "m_iCursor.0000", "m_iCursor.0001", "CBodyComponent.m_cellX", "CBodyComponent.m_cellY", "CBodyComponent.m_vecX", "CBodyComponent.m_vecY"};
    	String[] tracked_fields = {"m_lifeState"};
    	
    	boolean show = false;
    	for(int j = 0; j < ignored_ents.length; ++j)
			if(e.getDtClass().getDtName().equals(ignored_ents[j]))
				show = false;
    	for(int j = 0; j < checked_ents.length; ++j)
			if(e.getDtClass().getDtName().equals(checked_ents[j]))
				show = true;
    	
    	boolean tracked = true;
    	for(int i = 0; i < a; ++i)
    	{
			String fieldname = e.getDtClass().getNameForFieldPath(fields[i]);
    		updates += fieldname+" ";
    		for(int j = 0; j < ignored_fields.length; ++j)
    			if(fieldname.equals(ignored_fields[j]))
    				n_ignored++;
    		for(int j = 0; j < tracked_fields.length; ++j)
    			if(fieldname.equals(tracked_fields[j]))
    				tracked=true;
    	}
    	updates+="]";
    	if(!show && (!tracked || n_ignored == a))
    		return;
    	String entity_name = e.getDtClass().getDtName();
    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
    	//output.writeEntityEvent("update", time, entity_name+", "+a+", "+e.getHandle()+", "+updates);//.toString()
    	

    	String[] creep_entities = {"npc_dota_creep_lane", "npc_dota_creep_siege", "npc_dota_creep_neutral"};
    	if(entity_name != null && contains(entity_name, creep_entities))
    	{
    		boolean life_changed=false;
    		for(int i = 0; i < a; ++i)
        	{
    			String fieldname = e.getDtClass().getNameForFieldPath(fields[i]);
    			if(fieldname.equals("m_lifeState"))
    			{
    				life_changed=true;
					break;
    			}
        	}

    		if(life_changed)
    		{
    			//System.out.println(e.toString());
    			int lifestate= (int)getEntityProperty(e, "m_lifeState", null);
    			int team= (int)getEntityProperty(e, "m_iTeamNum", null);
    			Vector2f pos = computePosition(e);
				if(lifestate == 1)//just died
					output.writeEntityEvent("CREEP_DEATH", time, entity_name+", "+team+", "+", "+pos.x+", "+pos.y);//.toString()
    	    	
    		}
    	}
    	
    }
    public static boolean contains(String s, String[] list)
    {
		for(int j = 0; j < list.length; ++j)
			if(s.equals(list[j]))
				return true;
		return false;
    }
    @OnEntityDeleted
    public void onEntityDeleted(Context ctx, Entity e) {
    	 double time = 0;
         Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
 		if (grp != null) {
         	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
     		time = t;
         }
    	//output.writeEntityEvent("delete", time, e.getDtClass().getDtName()+", "+e.getHandle());
    }
    
    @OnCombatLogEntry
    public void onCombatLogEntry(Context ctx, CombatLogEntry cle) {
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
    	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
    	Double time = (double) t;
    	
    	String event = time+ ",";
    	event += cle.getType().toString()+",";
        switch (cle.getType()) {
            case DOTA_COMBATLOG_DAMAGE:
            	event += getAttackerNameCompiled(cle)+","+
                    getTargetNameCompiled(cle)+","+
                    (cle.getInflictorName() != null ? String.format(" with %s", cle.getInflictorName()) : "") +","+
                    cle.getValue()+","+
                    (cle.getHealth() != 0 ? String.format(" (%s->%s)", cle.getHealth() + cle.getValue(), cle.getHealth()) : "");
                break;
		case DOTA_COMBATLOG_ABILITY:
            event +=
                    getAttackerNameCompiled(cle)+","+
                    (cle.isAbilityToggleOn() || cle.isAbilityToggleOff() ? "toggles" : "casts")+","+
                    cle.getInflictorName()+","+
                    cle.getAbilityLevel()+","+
                    (cle.isAbilityToggleOn() ? " on" : cle.isAbilityToggleOff() ? " off" : "")+","+
                    (cle.getTargetName() != null ? " on " + getAttackerNameCompiled(cle) : "");
			break;
		case DOTA_COMBATLOG_ABILITY_TRIGGER:
			break;
		case DOTA_COMBATLOG_BUYBACK:
			break;
		case DOTA_COMBATLOG_DEATH:
            event += getTargetNameCompiled(cle)+","+
                    getAttackerNameCompiled(cle);
			break;
		case DOTA_COMBATLOG_FIRST_BLOOD:
			break;
		case DOTA_COMBATLOG_GAME_STATE:
			event += cle.getValue()+",";
			break;
		case DOTA_COMBATLOG_GOLD:
            event +=
                    getTargetNameCompiled(cle)+","+
                    (cle.getValue() < 0 ? "looses" : "receives")+","+
                    Math.abs(cle.getValue());
			break;
		case DOTA_COMBATLOG_HEAL:
			event +=
                    getAttackerNameCompiled(cle)+","+
                    cle.getInflictorName()+","+
                    getTargetNameCompiled(cle)+","+
                    cle.getValue()+","+
                    (cle.getHealth() - cle.getValue())+","+
                    cle.getHealth();
			break;
		case DOTA_COMBATLOG_ITEM:
			event +=
                    getAttackerNameCompiled(cle)+","+
                    cle.getInflictorName();
			break;
		case DOTA_COMBATLOG_KILLSTREAK:
			break;
		case DOTA_COMBATLOG_LOCATION:
			break;
		case DOTA_COMBATLOG_MODIFIER_ADD:
			event +=
                    getTargetNameCompiled(cle)+","+
                    cle.getInflictorName()+","+
                    getAttackerNameCompiled(cle);
			break;
		case DOTA_COMBATLOG_MODIFIER_REFRESH:
			break;
		case DOTA_COMBATLOG_MODIFIER_REMOVE:
			event +=
                    getTargetNameCompiled(cle)+","+
                    cle.getInflictorName();
			break;
		case DOTA_COMBATLOG_MULTIKILL:
			break;
		case DOTA_COMBATLOG_NEUTRAL_CAMP_STACK:
			break;
		case DOTA_COMBATLOG_PICKUP_RUNE:
			break;
		case DOTA_COMBATLOG_PLAYERSTATS:
			break;
		case DOTA_COMBATLOG_PURCHASE:
			event +=
                    getTargetNameCompiled(cle)+","+
                    cle.getValueName();
			break;
		case DOTA_COMBATLOG_TEAM_BUILDING_KILL:
			break;
		case DOTA_COMBATLOG_XP:
            event +=
                    getTargetNameCompiled(cle)+","+
                    cle.getValue();
			break;
		default:
			break;
        }
        
        output.writeEvent(event);
    }
}
