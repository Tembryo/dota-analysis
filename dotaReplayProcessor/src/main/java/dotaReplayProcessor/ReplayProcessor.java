package dotaReplayProcessor;
import java.util.Arrays;

import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
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
import skadistats.clarity.processor.reader.OnMessage;
import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.ControllableRunner;
import skadistats.clarity.processor.runner.SimpleRunner;
import skadistats.clarity.processor.sendtables.DTClasses;
import skadistats.clarity.processor.stringtables.OnStringTableCreated;
import skadistats.clarity.processor.stringtables.OnStringTableEntry;
import skadistats.clarity.processor.tempentities.OnTempEntity;
import skadistats.clarity.processor.tempentities.TempEntities;
import skadistats.clarity.source.MappedFileSource;
import skadistats.clarity.wire.s1.proto.S1NetMessages;
import skadistats.clarity.wire.s2.proto.S2UserMessages.CUserMessageSayText2;
import skadistats.clarity.wire.common.proto.DotaUserMessages.CDOTAUserMsg_OverheadEvent;
import javax.vecmath.Vector2d;
import javax.vecmath.Vector2f;

import com.google.protobuf.ByteString;

import skadistats.clarity.decoder.FieldReader;
import skadistats.clarity.decoder.Util;
import skadistats.clarity.decoder.bitstream.BitStream;
import skadistats.clarity.decoder.s1.ReceiveProp;
import skadistats.clarity.decoder.s1.S1DTClass;

import java.util.HashMap;

public class ReplayProcessor {
	MappedFileSource file_source;
	OutputGenerator output;
	private static int MAX_COORD_INTEGER = 16384;
    HashMap<Integer, String> entity_names = new HashMap<Integer, String>();
    HashMap<Integer, String> cl_names = new HashMap<Integer, String>();
	
	boolean init = false;
    int num_players = 10;
    int[] valid_indices = new int[num_players];
    boolean[] hero_units_valid = new boolean[num_players];
	int n_hero_units_valid = 0;
	
	Map<String, Integer> hero_indices;
	Map<Integer, Integer> player_handles;
	Map<String, Double> data_fields;
	
	double last_time = -1;
	double tick_interval = 0.001;
	
	public ReplayProcessor(String filename_replay, OutputGenerator output) throws IOException {
		file_source = new MappedFileSource(filename_replay);

		data_fields = new HashMap<String, Double>();
		data_fields.put("time", 0.0);
    	for(int i = 0; i < num_players; ++i)
    	{
    		data_fields.put(i+"X", 0.0);
        	data_fields.put(i+"Y", 0.0);
        	data_fields.put(i+"HP", 0.0);
          	data_fields.put(i+"Mana", 0.0);
        	data_fields.put(i+"MouseX", 0.0);
          	data_fields.put(i+"MouseY", 0.0);
    		data_fields.put(i+"CamX", 0.0);
    		data_fields.put(i+"CamY", 0.0);
    		hero_units_valid[i] = false;
    	}
		this.output = output;
		this.output.init(data_fields);
		hero_indices = new HashMap<String, Integer>();
		player_handles = new HashMap<Integer, Integer>();
	}

	public void process() throws IOException {
		ControllableRunner runner = new ControllableRunner(file_source);
		TempEntities temp = new TempEntities();
		runner.runWith(this, temp);
        while(!runner.isAtEnd()) {
            runner.tick();
            if(data_fields.get("time") - last_time >= tick_interval)
            {
            	output.writeTick(data_fields);
            	last_time = data_fields.get("time");
            }
        }
        runner.halt();
		//new SimpleRunner(file_source).runWith(this);
	}
	
	double getTime(Context ctx)
	{
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
        if (grp != null) {
        	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
        	return (double) t;
        }
        else return 0;
	}
	
	@UsesEntities
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic) {
        //s1 DT_DOTAGameRulesProxy
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
        Entity pr = ctx.getProcessor(Entities.class).getByDtName("CDOTA_PlayerResource");
        Entity dData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataDire");
        Entity rData = ctx.getProcessor(Entities.class).getByDtName("CDOTA_DataRadiant");

        double time = getTime(ctx);
		data_fields.put("time", time);
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
                while (added < num_players && i < 100) {
                    //check each m_vecPlayerData to ensure the player's team is radiant or dire
                    int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", i);
                    if (playerTeam == 2 || playerTeam == 3) {
                        //if so, add it to validIndices, add 1 to added
                        valid_indices[added] = i;
                        added += 1;
                    }

                    i += 1;
                }
                init = true;
            }

            //System.err.println(pr);
            for (int i = 0; i < num_players; i++) {
                //Integer hero = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_nSelectedHeroID", validIndices[i]);
                int handle = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_hSelectedHero", valid_indices[i]);
                //Long steamid = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerSteamID", validIndices[i]);
                int playerTeam = getEntityProperty(pr, "m_vecPlayerData.%i.m_iPlayerTeam", valid_indices[i]);
                int teamSlot = getEntityProperty(pr, "m_vecPlayerTeamData.%i.m_iTeamSlot", valid_indices[i]);
                //System.err.format("hero:%s i:%s teamslot:%s playerteam:%s\n", hero, i, teamSlot, playerTeam);
                
                //2 is radiant, 3 is dire, 1 is other?
                Entity dataTeam = playerTeam == 2 ? rData : dData;

                //Entry entry = new Entry(time);
                //entry.type = "interval";
                //entry.slot = i;
                
                int gold = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedGold", teamSlot);
                int lh = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iLastHitCount", teamSlot);//TODO check all
                //entry.xp = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_iTotalEarnedXP", teamSlot);
                //entry.stuns = getEntityProperty(dataTeam, "m_vecDataTeam.%i.m_fStuns", teamSlot);


                //get the player's hero entity
                Entity e = ctx.getProcessor(Entities.class).getByHandle(handle);
                Entity pl = null;
                if(player_handles.containsKey(i))
                	pl = ctx.getProcessor(Entities.class).getByHandle(player_handles.get(i));
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
                  	data_fields.put(i+"Mana", ((Float)getEntityProperty(e, "m_flMana", null)).doubleValue());
                }
                if(pl != null)
                {
            	    Vector2f cam_pos = computePosition(pl);
                	data_fields.put(i+"MouseX", ((Integer)getEntityProperty(pl, "m_iCursor.0000", null)).doubleValue());
                  	data_fields.put(i+"MouseY", ((Integer)getEntityProperty(pl, "m_iCursor.0001", null)).doubleValue());
            		data_fields.put(i+"CamX", (double)cam_pos.x);
            		data_fields.put(i+"CamY", (double)cam_pos.y);
                }
                //es.output(entry);
            }
        }
        
        if(n_hero_units_valid < num_players)
        {
	        Iterator<Entity> players = ctx.getProcessor(Entities.class).getAllByDtName("CDOTAPlayer");
	        while(players.hasNext())
	        {

	        	Entity p = players.next();

	        	int id = (int)getEntityProperty(p,"m_iPlayerID", null);
	        	if(id >= 0 && !hero_units_valid[id])
	        	{
		            output.writeEvent(time, "PLAYER_ENT,"+id+","+p.getHandle());
		            System.out.println(id);
		            hero_units_valid[id] = true;
	            	player_handles.put(id, p.getHandle());
		            n_hero_units_valid++;
	        	}
	        }
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
        double time = getTime(ctx);
    	String entity_name = e.getDtClass().getDtName();
    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
    	{
    		String new_entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
    		if(new_entity_name != null)
    			entity_name = new_entity_name;
    	}
    	
        if(e.hasProperty("m_lifeState"))
		{
			Vector2f pos = computePosition(e);
			output.writeEntityEvent(time,"SPAWN", entity_name+","+e.getHandle()+","+pos.x+","+pos.y);//.toString()
		}
        if(entity_name != null && entity_name.contains("hero"))
    	{
    		processHeroCreate(ctx, e);
    	}
    	//output.writeEntityEvent("create", time, e.getDtClass().getDtName()+", "+e.getHandle());//.toString()
    }

    public void processHeroCreate(Context ctx, Entity e) {
		int visibility= (int)getEntityProperty(e, "m_iTaggedAsVisibleByTeam", null);
		String entity_name = e.getDtClass().getDtName();
    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
    	{
    		String new_entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
    		if(new_entity_name != null)
    			entity_name = new_entity_name;
    	}
    	Vector2f pos = computePosition(e);
		output.writeEntityEvent(getTime(ctx),"HERO_VISIBILITY", entity_name+","+e.getHandle()+","+visibility+","+pos.x+","+pos.y);//.toString()
    }
    
    @OnEntityUpdated
    public void onEntityUpdated(Context ctx, Entity e, FieldPath[] fields, int a) {
        double time = getTime(ctx);
        
    	/*String updates = "[";
    	int n_ignored = 0;
    	String[] ignored_ents = {"CDOTAWearableItem"};
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
    		return;*/
        for(int i = 0; i < a; ++i)
    	{
			String fieldname = e.getDtClass().getNameForFieldPath(fields[i]);
			if(fieldname.equals("m_nUnitState64"))
			{
				long state= (long)getEntityProperty(e, "m_nUnitState64", null);

		    	String entity_name = e.getDtClass().getDtName();
		    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
		    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
				
				output.writeEntityEvent(time,"HERO_STATE", entity_name+","+e.getHandle()+","+state);//.toString()
			}
    	}
         
        
    	String entity_name = e.getDtClass().getDtName();
    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
    	//output.writeEntityEvent("update", time, entity_name+", "+a+", "+e.getHandle()+", "+updates);//.toString()
    	

    	String[] creep_entities = {"npc_dota_creep_lane", "npc_dota_creep_siege", "npc_dota_creep_neutral"};
    	String[] hero_entities = {"npc_dota_creep_lane", "npc_dota_creep_siege", "npc_dota_creep_neutral"};
    	/*if(entity_name != null && contains(entity_name, creep_entities))
    	{
    		processCreepChange(ctx, e, fields, a);
    	}
    	else */if(entity_name != null && entity_name.contains("hero"))
    	{
    		processHeroChange(ctx, e, fields, a);
    	}
    	else if(e.getDtClass().getDtName().equals("CDOTAPlayer"))
    	{
    		processPlayerChange(ctx, e, fields, a);
    	}
    	
    	if(entity_name != null)
    	{
    		processThingChanges(ctx, e, fields, a);
    	}
    	
    }
    
	void processPlayerChange(Context ctx, Entity e, FieldPath[] fields, int a)
	{
        double time = getTime(ctx);
    	boolean selected_changed=false;
		for(int i = 0; i < a; ++i)
    	{
			String fieldname = e.getDtClass().getNameForFieldPath(fields[i]);
			if(fieldname.equals("m_hSpectatorQueryUnit"))
			{
				selected_changed=true;
				break;
			}
    	}

		if(selected_changed)
		{
			int id= (int)getEntityProperty(e, "m_iPlayerID", null);
			int selected= (int)getEntityProperty(e, "m_hSpectatorQueryUnit", null);
			Entity s_e = ctx.getProcessor(Entities.class).getByHandle(selected);
			String selected_name = "";
			if(s_e != null)
			{
				selected_name = s_e.getDtClass().getDtName();
		    	if(s_e.hasProperty("m_pEntity.m_nameStringableIndex"))
		    		selected_name = entity_names.get((int)getEntityProperty(s_e, "m_pEntity.m_nameStringableIndex", null));
			}
			output.writeEntityEvent(time,"PLAYER_CHANGE_SELECTION", id+","+selected+","+selected_name);//.toString()
		}
	}
	
	void processHeroChange(Context ctx, Entity e, FieldPath[] fields, int a)
	{
        double time = getTime(ctx);
    	
    	String entity_name = e.getDtClass().getDtName();
    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
    	
    	//System.out.println(e.toString());
		for(int i = 0; i < a; ++i)
    	{
			String fieldname = e.getDtClass().getNameForFieldPath(fields[i]);
			if(fieldname.equals("m_lifeState"))
			{
				int team= (int)getEntityProperty(e, "m_iTeamNum", null);
				Vector2f pos = computePosition(e);
				
				int lifestate= (int)getEntityProperty(e, "m_lifeState", null);

				if(lifestate == 1)//just died
					output.writeEntityEvent(time,"HERO_DEATH", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
				if(lifestate == 0)//just respawned
					output.writeEntityEvent(time,"HERO_RESPAWN", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
			}
			else if (fieldname.equals("m_iTaggedAsVisibleByTeam"))
			{
				Vector2f pos = computePosition(e);
				int visibility= (int)getEntityProperty(e, "m_iTaggedAsVisibleByTeam", null);

				output.writeEntityEvent(time,"HERO_VISIBILITY", entity_name+","+e.getHandle()+","+visibility+","+pos.x+","+pos.y);//.toString()
				break;
			}
    	}

	}
    
    /*void processCreepChange(Context ctx, Entity e, FieldPath[] fields, int a)
    {
        double time = getTime(ctx);
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
	    	String entity_name = e.getDtClass().getDtName();
	    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
	    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
			
			//System.out.println(e.toString());
			int lifestate= (int)getEntityProperty(e, "m_lifeState", null);
			int team= (int)getEntityProperty(e, "m_iTeamNum", null);
			Vector2f pos = computePosition(e);
			if(lifestate == 1)//just died
				output.writeEntityEvent(time,"CREEP_DEATH", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
			else if(lifestate == 0)//just spawned?7
				output.writeEntityEvent(time,"CREEP_SPAWN", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
		}
    }*/
    
    void processThingChanges(Context ctx, Entity e, FieldPath[] fields, int a)
    {
        double time = getTime(ctx);
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
	    	String entity_name = e.getDtClass().getDtName();
	    	if(e.hasProperty("m_pEntity.m_nameStringableIndex"))
	    		entity_name = entity_names.get((int)getEntityProperty(e, "m_pEntity.m_nameStringableIndex", null));
			
			//System.out.println(e.toString());
			int lifestate= (int)getEntityProperty(e, "m_lifeState", null);
			int team= (int)getEntityProperty(e, "m_iTeamNum", null);
			Vector2f pos = computePosition(e);
			if(lifestate == 0)//just spawned?7
				output.writeEntityEvent(time,"SPAWN", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
			else if(lifestate == 1)//just died
				output.writeEntityEvent(time,"DEATH", entity_name+","+e.getHandle()+","+team+","+pos.x+","+pos.y);//.toString()
			 
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
    
	@UsesEntities
    @OnMessage(CDOTAUserMsg_OverheadEvent.class)
    public void onAllChatS2(Context ctx, CDOTAUserMsg_OverheadEvent ohe) {
	   	 double time = 0;
	     Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
			if (grp != null) {
	     	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
	 		time = t;
	     }
		
    	output.writeEvent(time, ohe.getMessageType().toString()+","+ohe.getValue()+","+
    				ctx.getProcessor(Entities.class).getByIndex(ohe.getSourcePlayerEntindex()).getHandle()+","+
    				ctx.getProcessor(Entities.class).getByIndex(ohe.getTargetEntindex()).getHandle()+","+
    				ctx.getProcessor(Entities.class).getByIndex(ohe.getTargetPlayerEntindex()).getHandle());
    	
    				
    }
    
    @OnCombatLogEntry
    public void onCombatLogEntry(Context ctx, CombatLogEntry cle) {
        Entity grp = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
    	float t = getEntityProperty(grp, "m_pGameRules.m_fGameTime", null);
    	Double time = (double) t;
    	
    	String event = "";
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
        
        output.writeEvent(time, event);
    }
}
